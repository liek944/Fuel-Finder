-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.donation_impacts (
  id integer NOT NULL DEFAULT nextval('donation_impacts_id_seq'::regclass),
  cause character varying NOT NULL,
  total_amount numeric DEFAULT 0,
  impact_metrics jsonb,
  beneficiary_name character varying,
  beneficiary_verified boolean DEFAULT false,
  verification_date timestamp without time zone,
  last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT donation_impacts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.donations (
  id integer NOT NULL DEFAULT nextval('donations_id_seq'::regclass),
  amount numeric NOT NULL CHECK (amount >= 10::numeric AND amount <= 10000::numeric),
  currency character varying NOT NULL DEFAULT 'PHP'::character varying,
  donor_name character varying DEFAULT 'Anonymous'::character varying,
  donor_email character varying,
  donor_identifier character varying,
  payment_intent_id character varying UNIQUE,
  payment_method character varying,
  status character varying DEFAULT 'pending'::character varying,
  cause character varying DEFAULT 'general'::character varying,
  impact_description text,
  receipt_url text,
  notes text,
  metadata jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  paid_at timestamp without time zone,
  refunded_at timestamp without time zone,
  CONSTRAINT donations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.fuel_price_reports (
  id integer NOT NULL DEFAULT nextval('fuel_price_reports_id_seq'::regclass),
  station_id integer NOT NULL,
  fuel_type character varying DEFAULT 'Regular'::character varying,
  price numeric NOT NULL CHECK (price > 0::numeric),
  reporter_ip character varying,
  reporter_identifier character varying,
  is_verified boolean DEFAULT false,
  verified_by character varying,
  verified_at timestamp without time zone,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying]::text[])),
  rejected_by character varying,
  rejected_at timestamp without time zone,
  verified_by_owner_id uuid,
  reporter_name character varying DEFAULT 'Anonymous'::character varying,
  CONSTRAINT fuel_price_reports_pkey PRIMARY KEY (id),
  CONSTRAINT fuel_price_reports_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id),
  CONSTRAINT fuel_price_reports_verified_by_owner_id_fkey FOREIGN KEY (verified_by_owner_id) REFERENCES public.owners(id)
);
CREATE TABLE public.fuel_prices (
  id integer NOT NULL DEFAULT nextval('fuel_prices_id_seq'::regclass),
  station_id integer NOT NULL,
  fuel_type character varying NOT NULL CHECK (fuel_type IS NOT NULL AND fuel_type::text <> ''::text AND length(TRIM(BOTH FROM fuel_type)) >= 1 AND length(TRIM(BOTH FROM fuel_type)) <= 50),
  price numeric NOT NULL CHECK (price > 0::numeric),
  price_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  price_updated_by character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_community boolean DEFAULT false,
  CONSTRAINT fuel_prices_pkey PRIMARY KEY (id),
  CONSTRAINT fuel_prices_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id)
);
CREATE TABLE public.images (
  id integer NOT NULL DEFAULT nextval('images_id_seq'::regclass),
  filename character varying NOT NULL UNIQUE,
  original_filename character varying NOT NULL,
  mime_type character varying NOT NULL,
  size integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  station_id integer,
  poi_id integer,
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  alt_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image_url text,
  thumbnail_url text,
  storage_path text,
  thumbnail_storage_path text,
  CONSTRAINT images_pkey PRIMARY KEY (id),
  CONSTRAINT images_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id),
  CONSTRAINT images_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id)
);
CREATE TABLE public.owner_activity_logs (
  id integer NOT NULL DEFAULT nextval('owner_activity_logs_id_seq'::regclass),
  owner_id uuid NOT NULL,
  action_type character varying NOT NULL,
  station_id integer,
  price_report_id integer,
  request_ip character varying,
  user_agent text,
  details jsonb,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT owner_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT owner_activity_logs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.owners(id),
  CONSTRAINT owner_activity_logs_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id),
  CONSTRAINT owner_activity_logs_price_report_id_fkey FOREIGN KEY (price_report_id) REFERENCES public.fuel_price_reports(id)
);
CREATE TABLE public.owners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  domain character varying NOT NULL UNIQUE,
  api_key text NOT NULL UNIQUE,
  email character varying,
  phone character varying,
  contact_person character varying,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  theme_config jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT owners_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pois (
  id integer NOT NULL DEFAULT nextval('pois_id_seq'::regclass),
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['gas'::text, 'convenience'::text, 'repair'::text, 'car_wash'::text, 'motor_shop'::text])),
  geom USER-DEFINED NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  address text,
  phone character varying,
  operating_hours jsonb,
  CONSTRAINT pois_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reviews (
  id integer NOT NULL DEFAULT nextval('reviews_id_seq'::regclass),
  target_type character varying NOT NULL CHECK (target_type IN ('station', 'poi')),
  target_id integer NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR LENGTH(comment) <= 500),
  status character varying NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending', 'rejected')),
  display_name character varying,
  session_id character varying,
  ip inet,
  user_agent text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reviews_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_reviews_target ON public.reviews(target_type, target_id);
CREATE INDEX idx_reviews_status ON public.reviews(status);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX idx_reviews_session_target ON public.reviews(session_id, target_type, target_id, created_at);

CREATE TABLE public.research_access_logs (
  id bigint NOT NULL DEFAULT nextval('research_access_logs_id_seq'::regclass),
  api_key_hash character varying,
  requester_ip character varying NOT NULL,
  user_agent text,
  endpoint character varying NOT NULL,
  query_params jsonb,
  rows_returned integer,
  response_time_ms integer,
  status_code integer,
  request_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  research_purpose text,
  institution text,
  CONSTRAINT research_access_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.research_trip_points (
  id bigint NOT NULL DEFAULT nextval('research_trip_points_id_seq'::regclass),
  trip_id uuid NOT NULL,
  geom USER-DEFINED NOT NULL,
  sequence integer NOT NULL CHECK (sequence >= 0),
  relative_time_seconds integer NOT NULL CHECK (relative_time_seconds >= 0),
  speed_kmh numeric CHECK (speed_kmh >= 0::numeric),
  heading numeric CHECK (heading >= 0::numeric AND heading <= 360::numeric),
  accuracy_meters numeric CHECK (accuracy_meters > 0::numeric),
  elevation_meters numeric,
  CONSTRAINT research_trip_points_pkey PRIMARY KEY (id),
  CONSTRAINT research_trip_points_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.research_trips(id)
);
CREATE TABLE public.research_trips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  anonymous_user_id character varying NOT NULL,
  trip_date date NOT NULL,
  trip_hour integer CHECK (trip_hour >= 0 AND trip_hour <= 23),
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  distance_meters numeric,
  avg_speed_kmh numeric CHECK (avg_speed_kmh >= 0::numeric),
  max_speed_kmh numeric CHECK (max_speed_kmh >= 0::numeric),
  total_points integer NOT NULL CHECK (total_points >= 2),
  bbox_min_lat numeric CHECK (bbox_min_lat >= '-90'::integer::numeric AND bbox_min_lat <= 90::numeric),
  bbox_min_lon numeric CHECK (bbox_min_lon >= '-180'::integer::numeric AND bbox_min_lon <= 180::numeric),
  bbox_max_lat numeric CHECK (bbox_max_lat >= '-90'::integer::numeric AND bbox_max_lat <= 90::numeric),
  bbox_max_lon numeric CHECK (bbox_max_lon >= '-180'::integer::numeric AND bbox_max_lon <= 180::numeric),
  avg_accuracy_meters numeric,
  is_high_quality boolean DEFAULT true,
  submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  data_version character varying DEFAULT '1.0'::character varying,
  CONSTRAINT research_trips_pkey PRIMARY KEY (id)
);
CREATE TABLE public.research_user_consents (
  id integer NOT NULL DEFAULT nextval('research_user_consents_id_seq'::regclass),
  anonymous_user_id character varying NOT NULL UNIQUE,
  consent_given boolean DEFAULT true,
  consent_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  consent_withdrawn_date timestamp without time zone,
  terms_version character varying DEFAULT '1.0'::character varying,
  ip_address character varying,
  user_agent text,
  CONSTRAINT research_user_consents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.schema_migrations (
  version character varying NOT NULL,
  description text,
  applied_at timestamp with time zone DEFAULT now(),
  CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.stations (
  id integer NOT NULL DEFAULT nextval('stations_id_seq'::regclass),
  name character varying NOT NULL,
  brand character varying NOT NULL,
  fuel_price numeric,
  services ARRAY,
  address text,
  phone character varying,
  operating_hours jsonb,
  geom USER-DEFINED NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  price_updated_at timestamp without time zone,
  price_updated_by character varying,
  owner_id uuid,
  theme_config jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT stations_pkey PRIMARY KEY (id),
  CONSTRAINT stations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.owners(id)
);
CREATE TABLE public.user_location_history (
  id integer NOT NULL DEFAULT nextval('user_location_history_id_seq'::regclass),
  session_id character varying NOT NULL,
  latitude numeric NOT NULL CHECK (latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  longitude numeric NOT NULL CHECK (longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  accuracy numeric,
  altitude numeric,
  speed numeric,
  heading numeric,
  geom USER-DEFINED NOT NULL,
  recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_location_history_pkey PRIMARY KEY (id),
  CONSTRAINT user_location_history_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.user_tracking_sessions(session_id)
);
CREATE TABLE public.user_tracking_sessions (
  id integer NOT NULL DEFAULT nextval('user_tracking_sessions_id_seq'::regclass),
  session_id character varying NOT NULL UNIQUE,
  user_identifier character varying,
  ip_address character varying,
  user_agent text,
  is_active boolean DEFAULT true,
  started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  ended_at timestamp without time zone,
  total_points integer DEFAULT 0,
  total_distance_meters numeric DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_tracking_sessions_pkey PRIMARY KEY (id)
);