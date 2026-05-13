from PIL import Image
import io
import pytesseract

class OCRService:
    @staticmethod
    def extract_text(image_content: bytes):
        image = Image.open(io.BytesIO(image_content))
        return pytesseract.image_to_string(image)
