import React, { useState } from 'react';
import { View, Image, Pressable, Text, StyleSheet, Modal } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { pickVideoFromGallery } from '../services/videoService';

interface Props {
  videoUri: string | null;
  thumbnailUri: string | null;
  onAttach: (uri: string, thumbnailUri: string | null) => void;
  onDetach: () => void;
  readOnly?: boolean;
}

export default function VideoAttachment({
  videoUri,
  thumbnailUri,
  onAttach,
  onDetach,
  readOnly = false,
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useVideoPlayer(videoUri ?? null, p => {
    p.loop = false;
  });

  async function handlePick() {
    const result = await pickVideoFromGallery();
    if (result) onAttach(result.uri, result.thumbnailUri);
  }

  if (!videoUri) {
    if (readOnly) return null;
    return (
      <Pressable style={styles.attachBtn} onPress={handlePick}>
        <Text style={styles.attachText}>📎  Attach Video</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setIsPlaying(true)} style={styles.thumbnail}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImg} />
        ) : (
          <View style={[styles.thumbnailImg, styles.thumbnailFallback]}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        )}
        <View style={styles.playOverlay}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
      </Pressable>

      {!readOnly && (
        <Pressable onPress={onDetach} style={styles.detachBtn}>
          <Text style={styles.detachText}>Remove Video</Text>
        </Pressable>
      )}

      <Modal
        visible={isPlaying}
        animationType="slide"
        onRequestClose={() => {
          player.pause();
          setIsPlaying(false);
        }}
      >
        <View style={styles.modalContainer}>
          <VideoView
            player={player}
            style={styles.videoView}
            allowsFullscreen
            nativeControls
            contentFit="contain"
          />
          <Pressable
            onPress={() => {
              player.pause();
              setIsPlaying(false);
            }}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>✕  Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  attachBtn: {
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  attachText: { color: '#FF6B35', fontSize: 15 },
  container: { marginVertical: 8 },
  thumbnail: { position: 'relative', borderRadius: 8, overflow: 'hidden' },
  thumbnailImg: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#1C1C1E' },
  thumbnailFallback: { justifyContent: 'center', alignItems: 'center' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playIcon: { fontSize: 36, color: '#fff' },
  detachBtn: { marginTop: 6, alignItems: 'center' },
  detachText: { color: '#FF3B30', fontSize: 13 },
  modalContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  videoView: { flex: 1 },
  closeBtn: { padding: 20, alignItems: 'center' },
  closeText: { color: '#fff', fontSize: 17 },
});
