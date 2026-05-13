import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import FileResponse
from dotenv import load_dotenv

# Import Modular Services
from services.rag_service import RAGService
from services.ocr_service import OCRService
from services.tts_service import TTSService

load_dotenv()

app = FastAPI(title="EduAI-Studio Core")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    stream: Optional[str] = "Engineering"
    audience: Optional[str] = "Beginner"

@app.get("/")
async def root():
    return {"status": "EduAI Core Service is running"}

@app.post("/ingest")
async def ingest_file(file: UploadFile = File(...)):
    content = await file.read()
    temp_path = f"./temp_{file.filename}"
    
    try:
        if file.filename.lower().endswith((".pdf", ".txt")):
            with open(temp_path, "wb") as f:
                f.write(content)
            count = RAGService.ingest_file(temp_path, file.filename.endswith(".pdf"))
        elif file.filename.lower().endswith((".png", ".jpg", ".jpeg")):
            text = OCRService.extract_text(content)
            count = RAGService.ingest_text(text)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
            
        return {"message": f"Successfully indexed {count} chunks"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/generate/notes")
async def generate_notes(req: QueryRequest):
    prompt = f"Subject Stream: {req.stream}\nAudience: {req.audience}\nQuery: {req.query}\n\nGenerate comprehensive academic notes."
    result = RAGService.query(prompt, k=5)
    return {"content": result}

@app.post("/generate/quiz")
async def generate_quiz(req: QueryRequest):
    prompt = f"Topic: {req.query}\nGenerate 5 MCQs as JSON."
    result = RAGService.query(prompt, k=8)
    return {"quiz": result}

@app.post("/generate/audio")
async def generate_audio(text: str = Form(...), voice: str = Form("en-US-GuyNeural")):
    output_path = f"./temp_audio_{hash(text)}.mp3"
    await TTSService.generate_audio(text, voice, output_path)
    return FileResponse(output_path, media_type="audio/mpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
