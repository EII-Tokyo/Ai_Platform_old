import React, { useState, useEffect, useCallback} from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  CircularProgress,
  Pagination,
  Select,
  MenuItem,
  Typography,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import { Task, Model, Media } from "../interface";
import CreateTaskModal from "../components/CreateTaskModal";
import RerunTaskModal from "../components/RerunTaskModal";
import NavigateToParentButton from '../components/button/NavigateToParentButton';
import videojs from "video.js";
import "video.js/dist/video-js.css";
import axios from 'axios';
import JSZip from 'jszip';

const TaskManagement = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRerunModalOpen, setIsRerunModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [taskToTerminate, setTaskToTerminate] = useState<Task | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [currentPath, setCurrentPath] = useState("/"); // 当前文件夹名
  const [currentFolderId, setCurrentFolderId] = useState<string>("root"); // 当前文件夹的ID
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState<{ [taskId: string]: boolean }>(
    {}
  );

  const handleOpenDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/delete_tasks`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(selectedTasks),
        }
      );
      if (response.ok) {
        setSelectedTasks([]);
        await fetchTasks();
      } else {
        console.error("Failed to delete tasks");
      }
    } catch (error) {
      console.error("Error deleting tasks:", error);
    }
    handleCloseDeleteModal();
  };

  const getModelName = (modelId: string) => {
    const model = models.find((m) => m._id === modelId);
    return model ? model.name : "Model Deleted!!!";
  };

  const fetchModels = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/models`
      );
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      } else {
        console.error("Failed to fetch models");
      }
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  const formatTimestamp = (timestamp: number | null): string => {
    if (!timestamp) return "-";
    return new Date(timestamp * 1000).toLocaleString();
  };

  const fetchTasks = useCallback(async (folderId: string = 'root') => {
      setIsLoading(true);
      try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tasks?limit=${limit}&page_num=${page}${folderId ? `&folder_id=${folderId}` : ''}`);
          if (response.ok) {
              const data = await response.json();
              setTasks(data.tasks);
              setTotalPages(data.total_pages);
              setCurrentFolderId(folderId);
          } else {
              console.error('Failed to fetch tasks items');
          }
      } catch (error) {
          console.error('Error fetching tasks items:', error);
      } finally {
          setIsLoading(false);
      }
  }, [page, limit]);

  useEffect(() => {
    fetchTasks(currentFolderId);
    console.log('currentFolderId updated: ', currentFolderId);
    fetchModels();
  }, [currentFolderId]);

  const handleRerun = (task: Task, event: React.MouseEvent) => {
    // 阻止事件冒泡到 TableRow 的 onClick
    event.stopPropagation();

    setSelectedTask(task);
    setIsRerunModalOpen(true);
  };

  const handleOpenTerminateModal = (task: Task) => {
    setTaskToTerminate(task);
    setIsTerminateModalOpen(true);
  };

  const handleCloseTerminateModal = () => {
    setIsTerminateModalOpen(false);
    setTaskToTerminate(null);
  };

  const handleConfirmTerminate = async () => {
    if (taskToTerminate) {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/terminate_task/${taskToTerminate.celery_task_id}`,
          {
            method: "POST",
          }
        );
        if (response.ok) {
          await fetchTasks();
        } else {
          console.error("Failed to terminate task");
        }
      } catch (error) {
        console.error("Error terminating task:", error);
      }
    }
    handleCloseTerminateModal();
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAllTasks = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedTasks(tasks && tasks.map((task) => task._id));
    } else {
      setSelectedTasks([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "green";
      case "FAILURE":
        return "red";
      case "PENDING":
        return "orange";
      case "RUNNING":
        return "blue";
      case "REVOKED":
        return "grey";
      default:
        return "grey";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "success";
      case "FAILURE":
        return "error";
      case "PENDING":
        return "warning";
      case "RUNNING":
        return "info";
      case "REVOKED":
        return "inherit";
      default:
        return "inherit";
    }
  };

  const handleToggleShowAll = (taskId: string) => {
    setIsExpanded((prevState) => ({
      ...prevState,
      [taskId]: !prevState[taskId],
    }));
  };

  const handlePreviewMedia = (task: Task) => {
    // 如果点击的是已经选择的任务，则清除选择，恢复原布局
    if (selectedTask && selectedTask._id === task._id) {
      setSelectedTask(null);
    } else {
      setSelectedTask(task); // 更新所选任务
    }
  };

  const handleDownloadImage = async (task: Task, event: React.MouseEvent) => {
    // 阻止事件冒泡到 TableRow 的 onClick
    event.stopPropagation();

    try {
      // 获取文件内容
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/yolo-files/${task.result_file}`
      );
      const blob = await response.blob(); // 将文件内容转换为 blob

      // 创建一个下载链接
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob); // 创建临时 URL
      link.href = url;
      link.download = task.original_filename; // 使用表格中显示的 Media Name 作为下载文件名
      link.click();

      // 释放URL对象
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const handleDownloadFolder = async (task: Task, event: React.MouseEvent) => {
    // 阻止事件冒泡到 TableRow 的 onClick
    event.stopPropagation();

    try {
      // 获取文件夹下的所有任务项（假设通过 folder_id 获取）
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tasks?folder_id=${task._id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch folder contents');
      }
      
      const folderData = await response.json();
      const tasksInFolder = folderData.tasks;

      if (!tasksInFolder || tasksInFolder.length === 0) {
        console.error("Folder is empty");
        return;
      }

      // 创建一个 JSZip 实例
      const zip = new JSZip();

      console.log(tasksInFolder);

      // 循环遍历文件夹中的所有任务项并下载文件
      for (const item of tasksInFolder) {
        if (item.result_file) {
          const fileResponse = await fetch(`${process.env.REACT_APP_API_URL}/yolo-files/${item.result_file}`);
          if (!fileResponse.ok) {
            console.error(`Failed to download file: ${item.result_file}`);
            continue;
          }

          const blob = await fileResponse.blob(); // 下载图片内容

          // 添加到 ZIP 文件中
          zip.file(item.original_filename, blob);
        }
      }

      // 生成 ZIP 文件并下载
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(zipBlob);
      link.href = url;
      link.download = `${task.original_filename}.zip`; // 文件夹名称作为 ZIP 文件名
      link.click();

      // 释放 URL 对象
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error downloading folder:", error);
    }
  };

  // 主下载处理函数
  const handleDownload = async (task: Task, event: React.MouseEvent) => {
    if (task.media_type === 'folder') {
      // 处理文件夹下载
      await handleDownloadFolder(task, event);
    } else {
      // 单个文件下载
      await handleDownloadImage(task, event);
    }
  };

  // 处理双击文件夹的逻辑
  const handleDoubleClickFolder = async (folder: Task) => {
    if (folder.media_type !== "folder") return;

    // 更改当前文件夹名称和 ID
    setCurrentPath(folder.full_path ?? "");
    setCurrentFolderId(folder._id);
  };

  const handleNavigateToParent = async () => {
    if (currentFolderId !== "") {
      try {
        // 构建正确的 API 请求地址
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/get_task_parent_info_by_folder_id`,
          {
            folderId: currentFolderId,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 200) {
          // 确保 parent_id 存在，并且更新当前文件夹 ID
          const parent_path =
            (response.data.parent_path || "root") === "root"
              ? "/"
              : response.data.parent_path;
          setCurrentPath(parent_path);
          fetchTasks(response.data.parent_id);
        } else {
          // 处理后端返回的错误
          console.error(
            `Failed to fetch parent folder. Status: ${response.status}`
          );
        }
      } catch (error) {
        console.error("Error fetching parent folder:", error);
      }
    }
  };

  const stickyHeaderStyles = {
    position: "sticky",
    top: 0,
    backgroundColor: "white",
    zIndex: 1,
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-xl font-semibold">Task Management</div>
        <div>
          {selectedTasks.length > 0 && (
            <Button
              variant="contained"
              sx={{ textTransform: "none" }}
              disableElevation
              onClick={handleOpenDeleteModal}
              color="error"
            >
              Delete Selected ({selectedTasks.length})
            </Button>
          )}
          <NavigateToParentButton
            handleNavigateToParent={handleNavigateToParent}
            currentFolderId={currentFolderId}
          />
          <Button
            variant="contained"
            sx={{ textTransform: "none", marginLeft: "8px" }}
            disableElevation
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Task
          </Button>
        </div>
      </div>
      <Box sx={{ display: "flex", gap: 2, padding: 2 }}>
        {" "}
        {/* 使用 flex 布局 */}
        {/* 左侧的表格区域 */}
        <Paper
          elevation={3} // 为表格部分添加阴影边框
          sx={{
            flex: selectedTask ? 1 : 1.5,
            padding: 2,
            overflow: "auto",
            maxHeight: "90vh",
          }} // 保持最大高度和滚动条
        >
          <TableContainer sx={{ maxHeight: "80vh", width: "100%" }}>
            {/* 设置 TableContainer 的最大高度并允许滚动 */}
            <Table stickyHeader sx={{ width: "100%" }}>
              {/* 启用 stickyHeader  */}
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={stickyHeaderStyles}>
                    <Checkbox
                      indeterminate={
                        selectedTasks.length > 0 && tasks &&
                        selectedTasks.length < tasks.length
                      }
                      checked={
                        tasks && tasks.length > 0 &&
                        selectedTasks.length === tasks.length
                      }
                      onChange={handleSelectAllTasks}
                    />
                  </TableCell>
                  <TableCell sx={{ ...stickyHeaderStyles, width: "150px" }}>
                    Media Name
                  </TableCell>
                  <TableCell
                    sx={{ ...stickyHeaderStyles, textAlign: "center" }}
                  >
                    Media
                  </TableCell>

                  {!selectedTask && (
                    <>
                      <TableCell sx={stickyHeaderStyles}>Model Name</TableCell>
                      <TableCell sx={stickyHeaderStyles}>
                        Detect Classes
                      </TableCell>
                      <TableCell sx={stickyHeaderStyles}>Conf</TableCell>
                      <TableCell sx={stickyHeaderStyles}>Image Size</TableCell>
                      <TableCell sx={stickyHeaderStyles}>Augment</TableCell>
                      <TableCell sx={stickyHeaderStyles}>Insert Time</TableCell>
                      <TableCell sx={stickyHeaderStyles}>Start Time</TableCell>
                      <TableCell sx={stickyHeaderStyles}>End Time</TableCell>
                      <TableCell sx={stickyHeaderStyles}>Status</TableCell>
                      <TableCell sx={stickyHeaderStyles}>Progress</TableCell>
                    </>
                  )}

                  <TableCell sx={stickyHeaderStyles}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks && tasks.map((task: Task) => (
                  <TableRow
                    key={task._id}
                    onDoubleClick={() => handleDoubleClickFolder(task)} // 双击事件
                    sx={{
                      "&:hover": {
                        backgroundColor: "#e0f7fa", // 鼠标悬停时的背景色
                      },
                      transition: "background-color 0.3s ease", // 使背景色的变化更平滑
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedTasks.includes(task._id)}
                        onChange={() => handleSelectTask(task._id)}
                      />
                    </TableCell>
                    <TableCell>{task.original_filename}</TableCell>
                    <TableCell
                      sx={{
                        display: "flex",
                        justifyContent: "center", // 图片水平居中
                        alignItems: "center", // 图片垂直居中
                      }}
                    >
                      {task.media_type === "folder" ? (
                        <img
                          src={`${process.env.REACT_APP_MINIO_URL}/yolo-files/folder_blue.png`}
                          alt={task.original_filename}
                          style={{
                            width: "100px",
                            height: "100px",
                            objectFit: "cover",
                            cursor: "pointer",
                            backgroundColor: "#ffffff",
                          }}
                        />
                      ) : task.media_type === "image" ? (
                        <img
                          src={`${process.env.REACT_APP_MINIO_URL}/yolo-files/${task.minio_filename}`}
                          alt="Task input"
                          style={{
                            width: "180px",
                            height: "120px",
                            objectFit: "cover",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            task.media_type !== "folder" &&
                            handlePreviewMedia(task) }
                        />
                      ) : (
                        <video
                          src={`${process.env.REACT_APP_MINIO_URL}/yolo-files/${task.minio_filename}`}
                          style={{
                            width: "180px",
                            height: "120px",
                            objectFit: "cover",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            task.media_type !== "folder" &&
                            handlePreviewMedia(task) }
                        />
                      )}

                    </TableCell>
                    { !selectedTask && (
                      <TableCell
                        sx={{
                          color:
                            getModelName(task.model_id) === "Model Deleted!!!"
                              ? "red"
                              : "black",
                        }}
                      >
                        {task.media_type === "folder" ? '' : getModelName(task.model_id)}
                      </TableCell>
                    )}
                    {!selectedTask && (
                      <TableCell>
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {task.media_type === "folder" ? '' :
                           task && task.detect_classes &&
                            (isExpanded[task._id] // 根据当前 task 的状态决定显示
                              ? task.detect_classes.map((className, index) => (
                                  <Chip
                                    key={index}
                                    label={className}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                ))
                              : task.detect_classes
                                  .slice(0, 5)
                                  .map((className, index) => (
                                    <Chip
                                      key={index}
                                      label={className}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  )))}
                          {task.detect_classes &&
                            task.detect_classes.length > 5 && (
                              <Chip
                                label={
                                  isExpanded[task._id]
                                    ? "Collapse"
                                    : `+${task.detect_classes.length - 5}`
                                }
                                size="small"
                                color="secondary"
                                variant="outlined"
                                onClick={() => handleToggleShowAll(task._id)} // 切换当前行的展开状态
                                style={{ cursor: "pointer" }}
                              />
                            )}
                        </Box>
                      </TableCell>
                    )}
                    {!selectedTask && <TableCell>
                      {task.media_type === "folder" ? "" :task.conf}
                      </TableCell>}
                    {!selectedTask && (
                      <TableCell>
                      {task.media_type === "folder" ? "" : `${task.width}x${task.height}`}
                      </TableCell>
                    )}
                    {!selectedTask && (
                      <TableCell>{task.media_type === "folder" ? "" : task.augment ? "Yes" : "No"}</TableCell>
                    )}
                    {!selectedTask && (
                      <TableCell>
                        {formatTimestamp(task.inserted_time)}
                      </TableCell>
                    )}
                    {!selectedTask && (
                      <TableCell>
                        {task.media_type === "folder" ? "" : task.start_time
                          ? formatTimestamp(task.start_time)
                          : "-"}
                      </TableCell>
                    )}
                    {!selectedTask && (
                      <TableCell>
                        {task.media_type === "folder" ? "" : task.end_time ? formatTimestamp(task.end_time) : "-"}
                      </TableCell>
                    )}
                    {!selectedTask && (
                      <TableCell>
                        <Typography
                          style={{ color: getStatusColor(task.status) }}
                        >
                          {task.status}
                        </Typography>
                      </TableCell>
                    )}
                    {!selectedTask && (
                      <TableCell>
                        <Box position="relative" display="inline-flex">
                          <CircularProgress
                            variant="determinate"
                            value={task.progress || 0}
                            color={
                              getProgressColor(task.status) as
                                | "success"
                                | "error"
                                | "warning"
                                | "info"
                                | "inherit"
                            }
                          />
                          <Box
                            top={0}
                            left={0}
                            bottom={0}
                            right={0}
                            position="absolute"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Typography
                              variant="caption"
                              component="div"
                              color="textSecondary"
                            >
                              {`${Math.round(task.progress || 0)}%`}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        sx={{
                          textTransform: "none",
                          marginRight: "8px",
                          marginBottom: "4px",
                          minWidth: "120px",
                        }} // 设定最小宽度
                        variant="contained"
                        disableElevation
                        size="small"
                        onClick={(event) => handleDownload(task, event)} // 修改为下载功能
                      >
                        Download
                      </Button>
                      <Button
                        sx={{
                          textTransform: "none",
                          marginRight: "8px",
                          marginBottom: "4px",
                          minWidth: "120px",
                        }} // 设定最小宽度
                        variant="contained"
                        disableElevation
                        size="small"
                        onClick={(event) => handleRerun(task, event)}
                      >
                        Rerun
                      </Button>
                      {task.status !== "SUCCESS" &&
                        task.status !== "FAILURE" &&
                        task.status !== "REVOKED" && (
                          <Button
                            sx={{
                              textTransform: "none",
                              marginRight: "8px",
                              minWidth: "120px",
                            }} // 设定最小宽度
                            variant="contained"
                            disableElevation
                            size="small"
                            onClick={() => handleOpenTerminateModal(task)}
                            color="error"
                          >
                            Terminate
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        {/* 右侧的图片展示区域，仅当选择了任务时显示 */}
        {selectedTask && (
          <Paper
            elevation={3} // 为图片部分添加阴影边框
            sx={{
              flex: 2, // 占据页面2/3空间
              padding: 2,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "auto",
              maxHeight: "90vh", // 保持最大高度和滚动条
            }}
          >
            {selectedTask.media_type === "image" ? (
              <img
                src={`${process.env.REACT_APP_API_URL}/yolo-files/${selectedTask.minio_filename}`}
                alt="Selected task"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
              />
            ) : (
              <video
                src={`${process.env.REACT_APP_API_URL}/yolo-files/${selectedTask.minio_filename}`}
                controls
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
              />
            )}
          </Paper>
        )}
      </Box>
      <div className="flex justify-end mt-4 items-center">
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
        />
        <Select
          sx={{ "& .MuiOutlinedInput-input": { padding: "8px 12px" } }}
          value={limit}
          onChange={(e: any) => setLimit(e.target.value as number)}
        >
          <MenuItem value={10}>10</MenuItem>
          <MenuItem value={20}>20</MenuItem>
          <MenuItem value={50}>50</MenuItem>
        </Select>
      </div>
      <Dialog
        open={isTerminateModalOpen}
        onClose={handleCloseTerminateModal}
        aria-labelledby="terminate-dialog-title"
      >
        <DialogTitle id="terminate-dialog-title">
          Terminate Task
          <Button
            aria-label="close"
            onClick={handleCloseTerminateModal}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
              textTransform: "none",
            }}
            disableElevation
          >
            ×
          </Button>
        </DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to terminate this task?</Typography>
          {taskToTerminate && (
            <Box mt={2}>
              <Typography variant="subtitle2">Task Details:</Typography>
              <Typography>ID: {taskToTerminate.celery_task_id}</Typography>
              <Typography>Status: {taskToTerminate.status}</Typography>
              <Typography>
                Progress: {Math.round(taskToTerminate.progress || 0)}%
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseTerminateModal}
            color="primary"
            disableElevation
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmTerminate}
            color="error"
            variant="contained"
            disableElevation
            sx={{ textTransform: "none" }}
          >
            Terminate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Tasks
          <Button
            aria-label="close"
            onClick={handleCloseDeleteModal}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
              textTransform: "none",
            }}
            disableElevation
          >
            ×
          </Button>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedTasks.length} selected task
            {selectedTasks.length > 1 ? "s" : ""}?
          </Typography>
          <Typography variant="caption" color="error">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeleteModal}
            color="primary"
            disableElevation
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disableElevation
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <CreateTaskModal
        isAddModalOpen={isAddModalOpen}
        setIsAddModalOpen={setIsAddModalOpen}
        fetchTasks={fetchTasks}
        models={models}
      />

      <RerunTaskModal
        isOpen={isRerunModalOpen}
        onClose={() => setIsRerunModalOpen(false)}
        selectedTask={selectedTask}
        fetchTasks={fetchTasks}
        models={models}
      />
    </div>
  );
};

export default TaskManagement;
