from rest_framework import serializers
from .models import Test, Question, Option, StudyNote, Video


class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'label', 'text']


class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'question_text', 'correct_answer', 'explanation', 'order_index', 'options']


class TestSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = ['id', 'title', 'subject', 'difficulty', 'topics', 'created_at', 'questions', 'question_count']

    def get_question_count(self, obj):
        return obj.questions.count()


class TestSummarySerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = ['id', 'title', 'subject', 'difficulty', 'topics', 'created_at', 'question_count']

    def get_question_count(self, obj):
        return obj.questions.count()


class GenerateRequestSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    subject = serializers.CharField(max_length=100)
    topics = serializers.ListField(child=serializers.CharField(), min_length=1)
    difficulty = serializers.ChoiceField(choices=['Easy', 'Medium', 'Hard'])
    num_questions = serializers.IntegerField(min_value=1, max_value=30, default=10)


class StudyNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyNote
        fields = ['id', 'title', 'subject', 'style', 'topics', 'content', 'created_at']


class GenerateNotesRequestSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    subject = serializers.CharField(max_length=100)
    topics = serializers.ListField(child=serializers.CharField(), min_length=1)
    style = serializers.ChoiceField(choices=['exam', 'detailed', 'flashcard', 'mindmap', 'revision'], default='detailed')
class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ['id', 'title', 'subject', 'topics', 'video_type', 'script_data', 'created_at']
