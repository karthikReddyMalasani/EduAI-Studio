import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA

CHROMA_DB_PATH = "./chroma_db"
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vector_store = Chroma(persist_directory=CHROMA_DB_PATH, embedding_function=embeddings)

class RAGService:
    @staticmethod
    def ingest_text(text: str):
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.create_documents([text])
        vector_store.add_documents(chunks)
        vector_store.persist()
        return len(chunks)

    @staticmethod
    def ingest_file(file_path: str, is_pdf: bool):
        loader = PyPDFLoader(file_path) if is_pdf else TextLoader(file_path)
        documents = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.split_documents(documents)
        vector_store.add_documents(chunks)
        vector_store.persist()
        return len(chunks)

    @staticmethod
    def query(prompt: str, k: int = 5):
        llm = ChatOpenAI(
            model_name="meta-llama/llama-3.3-70b-instruct",
            openai_api_key=os.getenv("OPENROUTER_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=0.4
        )
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(search_kwargs={"k": k})
        )
        return qa_chain.run(prompt)
