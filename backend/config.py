import os
from supabase import create_client, Client

url: str = "https://rlbcntrphqnwlbceelbg.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsYmNudHJwaHFud2xiY2VlbGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTExMTIsImV4cCI6MjA4MzM2NzExMn0.jYHOkNSAq9Syhwvn0B0OgFoPX2ss_PdRdhXXNo7qWY0"

supabase: Client = create_client(url, key)