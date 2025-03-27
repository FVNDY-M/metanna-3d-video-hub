
const handleDeleteConfirm = async () => {
  if (!selectedVideo || !selectedVideo.id) return;
  try {
    await handleDeleteVideo(selectedVideo.id);
  } catch (error) {
    console.error('Error in delete confirmation handler:', error);
  } finally {
    setIsDeleteDialogOpen(false);
    setSelectedVideo(null);
  }
};
