import React from 'react';
import { TableRow, TableCell, Checkbox, Chip, Button } from '@mui/material';
import { Media } from '../interface';
import axios from 'axios';

interface MediaItemProps {
    media: Media;
    selectedMedias: string[];
    setSelectedMedias: React.Dispatch<React.SetStateAction<string[]>>;
    setFlashingRow: React.Dispatch<React.SetStateAction<string | null>>;
    setCurrentFolderId: React.Dispatch<React.SetStateAction<string>>;
    flashingRow: string | null; // 添加这行
    setCurrentPath: React.Dispatch<React.SetStateAction<string>>;
    handleRunWithModel: (media: Media) => void;
    handlePreviewMedia: (media: Media) => void;
}

const MediaItem: React.FC<MediaItemProps> = ({
    media,
    selectedMedias,
    setSelectedMedias,
    setFlashingRow,
    flashingRow,
    setCurrentFolderId,
    setCurrentPath,
    handleRunWithModel,
    handlePreviewMedia,
}) => {

    const handleDoubleClickFolder = async () => {
        if (media.media_type !== 'folder') return;

        // 触发背景闪烁效果
        setFlashingRow(media._id);
        setTimeout(() => setFlashingRow(null), 300); // 背景闪烁效果持续300毫秒

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/get_parent_info_by_folder_id`, {
                folderId: media._id,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 200) {
                const parent_path = (response.data.parent_path || 'root') === 'root' ? '/' : response.data.parent_path;
                setCurrentPath(parent_path);
                setCurrentFolderId(media._id);
            } else {
                console.error(`Failed to fetch folder. Status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching folder:', error);
        }
    };

    return (
        <TableRow
            key={media._id}
            hover
            sx={{
                "&:hover": { backgroundColor: "#e0f7fa" },
                backgroundColor: flashingRow === media._id ? "#ffeb3b" : "inherit",
            }}
            onDoubleClick={handleDoubleClickFolder} // 将 handleDoubleClickFolder 绑定在双击事件上
        >
            <TableCell padding="checkbox">
                <Checkbox
                    checked={selectedMedias.includes(media._id)}
                    onChange={() =>
                        setSelectedMedias((prev) =>
                            prev.includes(media._id)
                                ? prev.filter((item) => item !== media._id)
                                : [...prev, media._id]
                        )
                    }
                />
            </TableCell>
            <TableCell>
                {media.media_type === 'folder' ? (
                    <img
                        src={`${process.env.REACT_APP_API_URL}/yolo-files/folder_blue.png`}
                        alt={media.original_filename}
                        style={{
                            width: '100px',
                            height: '100px',
                            objectFit: 'contain',
                            cursor: 'pointer',
                            backgroundColor: '#ffffff',
                        }}
                    />
                ) : media.media_type === 'image' ? (
                    <img
                        src={`${process.env.REACT_APP_API_URL}/yolo-files/${media.minio_filename}`}
                        alt={media.name}
                        style={{
                            width: '100px',
                            height: '100px',
                            objectFit: 'cover',
                            cursor: 'pointer',
                        }}
                        onClick={() => handlePreviewMedia(media)}
                    />
                ) : media.media_type === 'video' ? (
                    <video
                        src={`${process.env.REACT_APP_API_URL}/yolo-files/${media.minio_filename}`}
                        style={{
                            width: '100px',
                            height: '100px',
                            objectFit: 'cover',
                            cursor: 'pointer',
                        }}
                        onClick={() => handlePreviewMedia(media)}
                    />
                ) : null}
            </TableCell>
            <TableCell>{media.original_filename}</TableCell>
            <TableCell>
                <Chip label={media.media_type} size="small" color="primary" variant="outlined" />
            </TableCell>
            <TableCell>
                {media.file_size ? `${(media.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
            </TableCell>
            <TableCell>
                {media.upload_time ? new Date(media.upload_time).toLocaleString() : ''}
            </TableCell>
            <TableCell>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => handleRunWithModel(media)}
                    disableElevation
                    sx={{ textTransform: 'none' }}
                >
                    Run with Model
                </Button>
            </TableCell>
        </TableRow>
    );
};

export default MediaItem;
