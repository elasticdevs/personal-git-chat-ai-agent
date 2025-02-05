import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { openAIApiKey, client } from '../helper.js';


const embeddings = new OpenAIEmbeddings({ openAIApiKey: openAIApiKey })

const vectorStore = new SupabaseVectorStore(embeddings, {
    client,
    tableName: 'git',
    queryName: 'match_git'
})

const retriever = vectorStore.asRetriever()

export { retriever }