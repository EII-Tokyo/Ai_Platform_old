import React from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { BrowserLayout, MobileLayout } from "../components/Layout";
import TaskManagement from "../pages/Task";
import Settings from "../pages/Settings";
import Dashboard from "../pages/Dashboard";
import ImageViewer from "../pages/ImageViewer";
import MobileIndex from "../mobilePages/Index";
import ModelManagement from "../pages/Model";

export function BrowserRoute() {
  const routes = useRoutes([
    {
      path: '/',
      element: <BrowserLayout />,
      children: [
        { element: <TaskManagement />, index: true },
        { element: <ModelManagement />, path: 'Model' },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ]);

  return routes;
}

export function MobileRoute() {
  const routes = useRoutes([
    {
      path: '/',
      element: <MobileLayout />,
      children: [
        { element: <MobileIndex />, index: true },
        { element: <ModelManagement />, path: 'Model' },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ]);

  return routes;
}
