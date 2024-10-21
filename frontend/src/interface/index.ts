export interface LabelConfig {
  label: string;
  color: string;
  detect: boolean;
}

export interface Config {
  "S/N": string;
  validity_start_date: string;
  validity_end_date: string;
  upload_image: boolean;
  score_threshold: number;
  show_confidence: boolean;
  status: string;
  font_size: number;
  font_weight: number;
  pickup_color: string;
  ai_img_size: number;
  x_offset: number;
  y_offset: number;
  cx_min: number;
  cx_max: number;
  cy_min: number;
  cy_max: number;
  yolo_weights: string;
  camera_ip: string;
  camera_username: string;
  camera_password: string;
  server_ip: string;
  yolo_options: string[];
  label_config: LabelConfig[];
}

export interface LabelData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  confidence: number;
  x_pickup: number;
  y_pickup: number;
}

export interface ImageData {
  url: string;
  width: number;
  height: number;
  labels: LabelData[];
  time: string;
}

export interface group_images_by_hour {
  hour: string;
  count: number;
}

export interface group_labels_by_hour {
  hour: string;
  count: number;
}

export interface group_labels_by_kind {
  label: string;
  count: number;
}

export interface DashboardData {
  total_images: number;
  total_labels: number;
  group_images_by_hour: group_images_by_hour[];
  group_labels_by_hour: group_labels_by_hour[];
  group_labels_by_kind: group_labels_by_kind[];
}

// types.ts 或 Task.ts

export interface Task {
  _id: string;
  celery_task_id: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILURE" | "REVOKED";
  media_id: string;
  media_type: "image" | "video";
  model_id: string;
  detect_classes: string[];
  original_filename: string;
  minio_filename: string;
  file_size: number;
  content_type: string;
  conf: number;
  width: number;
  height: number;
  augment: boolean;
  inserted_time: number; // Unix timestamp
  start_time?: number; // Unix timestamp, optional
  end_time?: number; // Unix timestamp, optional
  progress?: number; // 0 to 100
  result_file: string; // Minio filename
  error?: string;
}

// 可以添加一些辅助类型
export type TaskStatus = Task["status"];
export type FileType = Task["media_type"];

// 用于创建新任务的接口
export interface CreateTaskInput {
  media_id: string;
  media_type: FileType;
  model_id: string;
  conf: number;
  width: number;
  height: number;
  augment: boolean;
  selectedClasses: string[];
}

export interface ITaskRequest {
  media_id: string;
  media_type: string;
  model_id: string;
  conf: number;
  width: number;
  height: number;
  augment: boolean;
  detect_classes: string[];
  detect_class_indices: number[];
}

// 用于更新任务的接口
export interface UpdateTaskInput {
  conf?: number;
  width?: number;
  height?: number;
  augment?: boolean;
}

export interface Model {
  _id: string;
  name: string;
  description: string;
  created_at: number;
  classes: string[];
  default_detect_classes: string[];
}

export interface Media {
  _id: string;
  name: string;
  description: string;
  parent_id?: string | null;
  full_path?: string | null;
  file_lists?: string[]; // 保存当前文件夹下所有文件的名称
  original_filename: string;
  minio_filename: string;
  file_size: number;
  content_type: string;
  vcodec: string;
  upload_time: number;
  media_type: "image" | "video" | "folder";
  width: number;
  height: number;
  duration: number;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILURE" | "REVOKED";
  progress: number;
  celery_task_id: string;
  start_time: number;
  error_message: string;
  end_time: number;
}
