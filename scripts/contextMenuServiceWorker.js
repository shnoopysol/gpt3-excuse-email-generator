const getKey = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["openai-key"], (result) => {
      if (result["openai-key"]) {
        const decodedKey = atob(result["openai-key"]);
        resolve(decodedKey);
      }
    });
  });
};

// Allows service worker to communicate with the DOM.
const sendMessage = (content) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0].id;

    chrome.tabs.sendMessage(activeTab, { message: "inject", content }, (response) => {
      if (response.status === "failed") {
        console.log("injection failed.");
      }
    });
  });
};

const generate = async (prompt) => {
  const key = await getKey();
  const url = "https://api.openai.com/v1/completions";

  const completionResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 1250,
      temperature: 0.7,
    }),
  });

  const completion = await completionResponse.json();
  return completion.choices.pop();
};

const generateCompletionAction = async (info) => {
  try {

    // Loading message to DOM
    sendMessage('generating...');

    const { selectionText } = info;
    const basePromptPrefix = `
        Write an email to my professor explaining why I won't be able to make it to class today. 

        Here is the topic:
        `;

    const baseCompletion = await generate(`${basePromptPrefix}${selectionText}`);

    console.log(baseCompletion.text);

    // Payload message to DOM
    sendMessage(baseCompletion.text);
  } catch (e) {
    console.log(e);

    sendMessage(e.toString());
  }
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "context-run",
    title: "Generate excuse email",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(generateCompletionAction);
