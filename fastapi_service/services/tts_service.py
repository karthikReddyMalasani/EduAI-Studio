import edge_tts

class TTSService:
    @staticmethod
    async def generate_audio(text: str, voice: str, output_path: str):
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_path)
        return output_path
