import './style.css';
import { openAIApiKey } from './helper.js';
import { retriever } from './utils/retriever.js';
import { combineDocuments } from './utils/combineDocuments.js';
import { formatConvHistory } from './utils/formatConvHistory.js';
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";

const convHistory = [];
const llm = new ChatOpenAI({ openAIApiKey });

const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
    `Given some conversation history (if any) and a question, convert the question to a standalone question.
    conversation history: {conv_history}
    question: {question}
    standalone question:`
);

const answerPrompt = PromptTemplate.fromTemplate(
    `You are an enthusiastic and helpful programming expert who loves explaining codes to people and answer to a given question based on the context provided and the conversation history.
    Try to find the answer in the context. If the answer is not given in the context, find the answer in the conversation history if possible.
    Always speak as if you were chatting to a friend.
    context: {context}
    conversation history: {conv_history}
    question: {question}
    answer:`
);

const standaloneQuestionChain = standaloneQuestionPrompt
    .pipe(llm)
    .pipe(new StringOutputParser());

const retrieverChain = RunnableSequence.from([
    prevResult => prevResult.standalone_question,
    retriever,
    combineDocuments
]);

const answerChain = answerPrompt
    .pipe(llm)
    .pipe(new StringOutputParser());

const chain = RunnableSequence.from([
    {
        standalone_question: standaloneQuestionChain,
        original_input: new RunnablePassthrough()
    },
    {
        context: retrieverChain,
        question: ({ original_input }) => original_input.question,
        conv_history: ({ original_input }) => original_input.conv_history
    },
    answerChain
]);

document.addEventListener("DOMContentLoaded", () => {
    const cloneForm = document.getElementById('cloneForm');
    const resultDiv = document.getElementById('result');
    const userInput = document.getElementById('user-input');
    const chatbotConversation = document.getElementById('chatbot-conversation-container');

    if (!cloneForm || !resultDiv || !userInput || !chatbotConversation) {
        console.error("Required elements not found in DOM.");
        return;
    }

    cloneForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resultDiv.textContent = 'Processing...';

        const repoLink = document.getElementById('repoLink').value;
        const branchName = document.getElementById('branchName').value || 'main';
        const targetDir = document.getElementById('targetDir').value || './cloned-repo';

        try {
            const cloneResponse = await fetch('http://localhost:3000/clone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoLink, branch: branchName, workingDir: targetDir })
            });

            if (!cloneResponse.ok) throw new Error(await cloneResponse.text());

            const { cloneDir } = await cloneResponse.json();
            resultDiv.textContent = 'Cloning successful. Creating embeddings...';

            const embeddingResponse = await fetch('http://localhost:3000/create-embeddings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ directory: cloneDir })
            });

            if (!embeddingResponse.ok) throw new Error(await embeddingResponse.text());

            const embeddingResult = await embeddingResponse.json();
            resultDiv.textContent = embeddingResult.message;
        } catch (error) {
            resultDiv.textContent = `Error: ${error.message}`;
        }
    });

    document.getElementById('sendButton').addEventListener('click', progressConversation);
});

async function progressConversation() {
    const userInput = document.getElementById('user-input');
    const chatbotConversation = document.getElementById('chatbot-conversation-container');

    if (!userInput || !chatbotConversation) {
        console.error("Required elements not found in DOM.");
        return;
    }

    const question = userInput.value.trim();
    if (!question) return;
    
    userInput.value = '';

    const newHumanSpeechBubble = document.createElement('div');
    newHumanSpeechBubble.classList.add('speech', 'speech-human');
    newHumanSpeechBubble.textContent = question;
    chatbotConversation.appendChild(newHumanSpeechBubble);
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;

    try {
        const response = await chain.invoke({
            question,
            conv_history: formatConvHistory(convHistory)
        });

        convHistory.push(question);
        convHistory.push(response);

        const newAiSpeechBubble = document.createElement('div');
        newAiSpeechBubble.classList.add('speech', 'speech-ai');
        newAiSpeechBubble.textContent = response;
        chatbotConversation.appendChild(newAiSpeechBubble);
        chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
    } catch (error) {
        console.error("Error processing conversation:", error);
    }
}

