import io
import re
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User

from .models import Test, Question, Option, StudyNote
from .serializers import (
    GenerateRequestSerializer, TestSerializer, TestSummarySerializer,
    StudyNoteSerializer, GenerateNotesRequestSerializer
)
from .services.ai_service import generate_questions, generate_study_notes, generate_topic_video
from .services.pdf_service import generate_pdf, generate_note_pdf


class GenerateView(APIView):
    def post(self, request):
        serializer = GenerateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            raw_questions = generate_questions(
                topics=data['topics'],
                difficulty=data['difficulty'],
                num_questions=data['num_questions'],
                subject=data['subject']
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        # Create test — always linked to the requesting user
        user = request.user if request.user.is_authenticated else None
        test = Test.objects.create(
            user=user,
            title=data['title'],
            subject=data['subject'],
            difficulty=data['difficulty'],
            topics=data['topics']
        )

        for idx, q in enumerate(raw_questions):
            question = Question.objects.create(
                test=test,
                question_text=q['question'],
                correct_answer=q['correct_answer'],
                explanation=q.get('explanation', ''),
                order_index=idx
            )
            for label, text in q['options'].items():
                Option.objects.create(
                    question=question,
                    label=label,
                    text=text
                )

        serializer_out = TestSerializer(test)
        return Response(serializer_out.data, status=status.HTTP_201_CREATED)


class TestListView(APIView):
    def get(self, request):
        # Each user sees only their own tests. Anonymous users see public/unsaved tests.
        user = request.user if request.user.is_authenticated else None
        tests = Test.objects.filter(user=user)
        serializer = TestSummarySerializer(tests, many=True)
        return Response(serializer.data)


class TestDetailView(APIView):
    def get(self, request, pk):
        try:
            test = Test.objects.get(pk=pk, user=request.user)
        except Test.DoesNotExist:
            return Response({'error': 'Test not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TestSerializer(test)
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            test = Test.objects.get(pk=pk, user=request.user)
        except Test.DoesNotExist:
            return Response({'error': 'Test not found'}, status=status.HTTP_404_NOT_FOUND)
        test.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExportPDFView(APIView):
    def get(self, request, pk):
        try:
            test = Test.objects.get(pk=pk, user=request.user)
        except Test.DoesNotExist:
            return Response({'error': 'Test not found'}, status=status.HTTP_404_NOT_FOUND)

        pdf_bytes = generate_pdf(test)
        
        # Sanitize filename: remove non-alphanumeric (except _ and -)
        safe_title = re.sub(r'[^\w\-]', '_', test.title)
        filename = f"{safe_title}.pdf"
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class StudyNoteView(APIView):
    def post(self, request):
        serializer = GenerateNotesRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        note_style = data.get('style', 'detailed')
        try:
            content = generate_study_notes(
                topics=data['topics'],
                subject=data['subject'],
                style=note_style
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        user = request.user if request.user.is_authenticated else None
        note = StudyNote.objects.create(
            user=user,
            title=data['title'],
            subject=data['subject'],
            topics=data['topics'],
            style=note_style,
            content=content
        )

        serializer_out = StudyNoteSerializer(note)
        return Response(serializer_out.data, status=status.HTTP_201_CREATED)

    def get(self, request):
        # Each user sees only their own notes. Anonymous users see public/unsaved notes.
        user = request.user if request.user.is_authenticated else None
        notes = StudyNote.objects.filter(user=user)
        serializer = StudyNoteSerializer(notes, many=True)
        return Response(serializer.data)


class StudyNoteDetailView(APIView):
    def get(self, request, pk):
        try:
            note = StudyNote.objects.get(pk=pk, user=request.user)
        except StudyNote.DoesNotExist:
            return Response({'error': 'Study note not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = StudyNoteSerializer(note)
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            note = StudyNote.objects.get(pk=pk, user=request.user)
        except StudyNote.DoesNotExist:
            return Response({'error': 'Study note not found'}, status=status.HTTP_404_NOT_FOUND)
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExportNotePDFView(APIView):
    def get(self, request, pk):
        try:
            note = StudyNote.objects.get(pk=pk, user=request.user)
        except StudyNote.DoesNotExist:
            return Response({'error': 'Note not found'}, status=status.HTTP_404_NOT_FOUND)

        pdf_bytes = generate_note_pdf(note)
        
        # Sanitize filename
        safe_title = re.sub(r'[^\w\-]', '_', note.title)
        filename = f"{safe_title}.pdf"
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
class VideoGenerateView(APIView):
    """
    POST  /api/videos/generate/
    Body: { "subject": "Biology", "topics": ["Photosynthesis", "Respiration"] }
    Returns: { "video_url": "/media/videos/<filename>.mp4" }
    """
    def post(self, request):
        subject = request.data.get('subject', '').strip()
        topics = request.data.get('topics', [])

        if not subject:
            return Response({'error': 'subject is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not topics or not isinstance(topics, list):
            return Response({'error': 'topics must be a non-empty list'}, status=status.HTTP_400_BAD_REQUEST)

        import uuid
        filename = f"{uuid.uuid4().hex}.mp4"
        try:
            video_path = generate_topic_video(
                topics=topics,
                subject=subject,
                output_path=filename
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        # Build a URL relative to MEDIA_URL
        from django.conf import settings as django_settings
        rel_path = video_path.replace(str(django_settings.MEDIA_ROOT), '').replace('\\', '/').lstrip('/')
        video_url = f"{django_settings.MEDIA_URL}{rel_path}"
        return Response({'video_url': video_url}, status=status.HTTP_201_CREATED)


class AdminStatsView(APIView):
    """GET /api/admin/stats/ — returns platform-wide stats. Admin only."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.contrib.auth.models import User
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        week_ago = now - timedelta(days=7)

        total_users = User.objects.count()
        total_tests = Test.objects.count()
        total_notes = StudyNote.objects.count()
        tests_this_week = Test.objects.filter(created_at__gte=week_ago).count()
        notes_this_week = StudyNote.objects.filter(created_at__gte=week_ago).count()
        new_users_this_week = User.objects.filter(date_joined__gte=week_ago).count()

        # Difficulty breakdown
        from django.db.models import Count
        difficulty_breakdown = list(
            Test.objects.values('difficulty').annotate(count=Count('id'))
        )

        # Recent tests (last 10)
        recent_tests = list(
            Test.objects.order_by('-created_at')[:10].values(
                'id', 'title', 'subject', 'difficulty', 'created_at'
            )
        )
        for t in recent_tests:
            t['created_at'] = t['created_at'].isoformat()

        # Recent notes (last 10)
        recent_notes = list(
            StudyNote.objects.order_by('-created_at')[:10].values(
                'id', 'title', 'subject', 'style', 'created_at'
            )
        )
        for n in recent_notes:
            n['created_at'] = n['created_at'].isoformat()

        # All users
        users = list(
            User.objects.order_by('-date_joined').values(
                'id', 'username', 'email', 'is_staff', 'is_active', 'date_joined'
            )
        )
        for u in users:
            u['date_joined'] = u['date_joined'].isoformat()

        return Response({
            'stats': {
                'total_users': total_users,
                'total_tests': total_tests,
                'total_notes': total_notes,
                'tests_this_week': tests_this_week,
                'notes_this_week': notes_this_week,
                'new_users_this_week': new_users_this_week,
            },
            'difficulty_breakdown': difficulty_breakdown,
            'recent_tests': recent_tests,
            'recent_notes': recent_notes,
            'users': users,
        })



class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email', '')

        if not username or not password:
            return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password, email=email)

        refresh = RefreshToken.for_user(user)

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        }, status=status.HTTP_201_CREATED)
