-- ==============================================================================
-- CINEAI - PRODUCTION DATABASE SCHEMA (Supabase / PostgreSQL)
-- Multiplatform Streaming Curated by AI
-- ==============================================================================

-- 1. Enable pgvector extension for AI semantic search embeddings (future enhancement)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Movies and Series Table
CREATE TABLE IF NOT EXISTS public.movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    youtube_video_id VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    synopsis TEXT NOT NULL,
    genres TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    moods TEXT[] NOT NULL DEFAULT '{}',
    release_year INT NOT NULL CHECK (release_year >= 1895),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    poster_url TEXT NOT NULL,
    backdrop_url TEXT NOT NULL,
    channel_name VARCHAR(150) NOT NULL,
    channel_url TEXT,
    content_rating VARCHAR(10) NOT NULL DEFAULT 'Livre',
    language VARCHAR(20) NOT NULL DEFAULT 'Legendado',
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    rating_score NUMERIC(3, 1) NOT NULL DEFAULT 7.0 CHECK (rating_score >= 0 AND rating_score <= 10.0),
    badge VARCHAR(50),
    view_count BIGINT NOT NULL DEFAULT 0,
    -- Embedding vector for semantic retrieval using Gemini text-embedding
    embedding vector(768), 
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for lightning fast filtering & AI tool querying
CREATE INDEX IF NOT EXISTS idx_movies_youtube_id ON public.movies(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_movies_genres ON public.movies USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_movies_tags ON public.movies USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_movies_moods ON public.movies USING GIN(moods);
CREATE INDEX IF NOT EXISTS idx_movies_release_year ON public.movies(release_year);
CREATE INDEX IF NOT EXISTS idx_movies_rating_score ON public.movies(rating_score DESC);
CREATE INDEX IF NOT EXISTS idx_movies_featured ON public.movies(featured) WHERE featured = TRUE;

-- 3. User Profiles & Subscription (Micro-SaaS)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150),
    avatar_url TEXT,
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'past_due', 'canceled')),
    subscription_plan VARCHAR(50) DEFAULT 'monthly_9.90',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. User Watch History (Supports resuming playback across TV, Web & Mobile)
CREATE TABLE IF NOT EXISTS public.watch_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
    progress_seconds INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_movie_history UNIQUE (user_id, movie_id)
);

-- 5. User Favorites & Watchlist
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_movie_favorite UNIQUE (user_id, movie_id)
);

-- 6. AI Curation Sessions (Chat Logs & Feedback)
CREATE TABLE IF NOT EXISTS public.ai_curation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    session_title VARCHAR(150),
    user_mood_context VARCHAR(100),
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_movie_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Row Level Security (RLS)
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_curation_sessions ENABLE ROW LEVEL SECURITY;

-- Everyone can read active movies
CREATE POLICY "Public read active movies" 
ON public.movies FOR SELECT 
USING (is_active = TRUE);

-- Users can only read/update their own profiles
CREATE POLICY "Users view own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users update own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = id);

-- Users manage their own watch history
CREATE POLICY "Users manage watch history" 
ON public.watch_history FOR ALL 
USING (auth.uid() = user_id);

-- Users manage their own favorites
CREATE POLICY "Users manage favorites" 
ON public.user_favorites FOR ALL 
USING (auth.uid() = user_id);

-- Function for AI semantic similarity search (using pgvector)
CREATE OR REPLACE FUNCTION match_movies_by_embedding(
    query_embedding vector(768),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    synopsis TEXT,
    youtube_video_id VARCHAR,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        id,
        title,
        synopsis,
        youtube_video_id,
        1 - (movies.embedding <=> query_embedding) AS similarity
    FROM public.movies
    WHERE is_active = TRUE AND 1 - (movies.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;
