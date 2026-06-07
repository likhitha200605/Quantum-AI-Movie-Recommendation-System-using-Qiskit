#!/usr/bin/env bash
# ==============================================================================
# QuantumFlix Video Transcoding Pipeline (FFmpeg ABR)
# Optimized for HLS and DASH packaging with keyframe alignment.
# ==============================================================================

set -euo pipefail

INPUT_FILE="${1:-}"
OUTPUT_DIR="${2:-}"
SEGMENT_DURATION=6 # Segment length in seconds
GOP_SIZE=48        # 2 seconds GOP for 24fps input (use 50 for 25fps, 60 for 30fps)

if [ -z "$INPUT_FILE" ] || [ -z "$OUTPUT_DIR" ]; then
    echo "Usage: ./transcode.sh <input_video.mp4> <output_directory>"
    exit 1
fi

mkdir -p "$OUTPUT_DIR/hls"
mkdir -p "$OUTPUT_DIR/dash"

echo "Starting transcoding pipeline for: $INPUT_FILE"

# ==============================================================================
# 1. HLS MULTI-BITRATE ENCODING & PACKAGING
# ==============================================================================
echo "Processing HLS Transcoding..."
ffmpeg -y -i "$INPUT_FILE" \
    -filter_complex "[0:v]split=3[v1][v2][v3]; \
                     [v1]scale=w=1920:h=1080[v1out]; \
                     [v2]scale=w=1280:h=720[v2out]; \
                     [v3]scale=w=854:h=480[v3out]" \
    -map "[v1out]" -c:v:0 libx264 -b:v:0 4500k -maxrate:v:0 4800k -bufsize:v:0 9000k -g "$GOP_SIZE" -keyint_min "$GOP_SIZE" -sc_threshold 0 \
    -map "[v2out]" -c:v:1 libx264 -b:v:1 2500k -maxrate:v:1 2700k -bufsize:v:1 5000k -g "$GOP_SIZE" -keyint_min "$GOP_SIZE" -sc_threshold 0 \
    -map "[v3out]" -c:v:2 libx264 -b:v:2 800k  -maxrate:v:2 850k  -bufsize:v:2 1600k -g "$GOP_SIZE" -keyint_min "$GOP_SIZE" -sc_threshold 0 \
    -map a:0 -c:a:0 aac -b:a:0 128k \
    -map a:0 -c:a:1 aac -b:a:1 128k \
    -map a:0 -c:a:2 aac -b:a:2 96k \
    -f hls \
    -hls_time "$SEGMENT_DURATION" \
    -hls_playlist_type vod \
    -hls_segment_filename "$OUTPUT_DIR/hls/%v_seq_%03d.ts" \
    -master_pl_name master.m3u8 \
    -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \
    "$OUTPUT_DIR/hls/%v_manifest.m3u8"

# ==============================================================================
# 2. DASH MULTI-BITRATE ENCODING & PACKAGING
# ==============================================================================
echo "Processing DASH Transcoding..."
ffmpeg -y -i "$INPUT_FILE" \
    -filter_complex "[0:v]split=3[v1][v2][v3]; \
                     [v1]scale=w=1920:h=1080[v1out]; \
                     [v2]scale=w=1280:h=720[v2out]; \
                     [v3]scale=w=854:h=480[v3out]" \
    -map "[v1out]" -c:v:0 libx264 -b:v:0 4500k -maxrate:v:0 4800k -bufsize:v:0 9000k -g "$GOP_SIZE" -keyint_min "$GOP_SIZE" -sc_threshold 0 \
    -map "[v2out]" -c:v:1 libx264 -b:v:1 2500k -maxrate:v:1 2700k -bufsize:v:1 5000k -g "$GOP_SIZE" -keyint_min "$GOP_SIZE" -sc_threshold 0 \
    -map "[v3out]" -c:v:2 libx264 -b:v:2 800k  -maxrate:v:2 850k  -bufsize:v:2 1600k -g "$GOP_SIZE" -keyint_min "$GOP_SIZE" -sc_threshold 0 \
    -map a:0 -c:a:0 aac -b:a:0 128k \
    -map a:0 -c:a:1 aac -b:a:1 128k \
    -map a:0 -c:a:2 aac -b:a:2 96k \
    -adaptation_sets "id=0,streams=v id=1,streams=a" \
    -f dash \
    -seg_duration "$SEGMENT_DURATION" \
    -use_template 1 \
    -use_timeline 1 \
    -init_seg_name 'init-stream$RepresentationID$.m4s' \
    -media_seg_name 'chunk-stream$RepresentationID$-$Number%05d$.m4s' \
    "$OUTPUT_DIR/dash/manifest.mpd"

# ==============================================================================
# NOTE ON DRM INTEGRATION (Widevine, FairPlay, PlayReady)
# ==============================================================================
# To apply digital rights management, the output fragments must be encrypted
# using Common Encryption (CENC). Shaka Packager is the industry standard tool:
#
# shaka-packager \
#   input=output_1080p.mp4,stream=video,output=dash/1080p_encrypted.mp4 \
#   input=output_720p.mp4,stream=video,output=dash/720p_encrypted.mp4 \
#   input=audio.mp4,stream=audio,output=dash/audio_encrypted.mp4 \
#   --enable_widevine_encryption \
#   --key_server_url http://license-server.example.com/widevine \
#   --content_id "quantumflix_movie_001" \
#   --signer "auth_credential" \
#   --generate_static_live_shared_key \
#   --mpd_output dash/manifest_protected.mpd \
#   --hls_output hls/master_protected.m3u8
# ==============================================================================

echo "Transcoding completed. Output stored in: $OUTPUT_DIR"
