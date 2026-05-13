from django.urls import path
from .views import (
    GenerateView, TestListView, TestDetailView, ExportPDFView,
    StudyNoteView, StudyNoteDetailView, ExportNotePDFView,
    VideoGenerateView, AdminStatsView, VideoListView
)

urlpatterns = [
    path('generate/', GenerateView.as_view(), name='generate'),
    path('tests/', TestListView.as_view(), name='test-list'),
    path('tests/<uuid:pk>/', TestDetailView.as_view(), name='test-detail'),
    path('export/<uuid:pk>/', ExportPDFView.as_view(), name='export-pdf'),
    path('notes/', StudyNoteView.as_view(), name='study-notes'),
    path('notes/<uuid:pk>/', StudyNoteDetailView.as_view(), name='study-note-detail'),
    path('export-notes/<uuid:pk>/', ExportNotePDFView.as_view(), name='export-notes-pdf'),
    path('videos/generate/', VideoGenerateView.as_view(), name='video-generate'),
    path('videos/history/', VideoListView.as_view(), name='video-history'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
]
