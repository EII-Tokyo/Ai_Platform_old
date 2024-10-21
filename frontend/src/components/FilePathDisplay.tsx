import React from 'react';
import { Breadcrumbs, Typography } from '@mui/material';

interface FilePathDisplayProps {
  filePath: string;  // filePath 是一个字符串类型
}

const FilePathDisplay: React.FC<FilePathDisplayProps> = ({ filePath }) => {
  const pathSegments: string[] = filePath.split('/'); // pathSegments 是一个字符串数组

  return (
    <Breadcrumbs aria-label="breadcrumb">
      {pathSegments.map((segment: string, index: number) => (
        <Typography key={index} color="textPrimary">
          {segment}
        </Typography>
      ))}
    </Breadcrumbs>
  );
};

export default FilePathDisplay;