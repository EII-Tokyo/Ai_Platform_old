import React from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { BrowserLayout, MobileLayout } from "../components/Layout";
import TaskManagement from "../pages/Task";
import Settings from "../pages/Settings";
import Dashboard from "../pages/Dashboard";
import ImageViewer from "../pages/ImageViewer";
import MobileIndex from "../mobilePages/Index";
import ModelManagement from "../pages/Model";
import MediaManagement from "../pages/Media";
import Test from "../pages/Test"

export function BrowserRoute() {
  const routes = useRoutes([
    {
      path: '/',
      element: <BrowserLayout />,
      children: [
        { element: <TaskManagement />, index: true },
        { element: <MediaManagement />, path: 'Media' },
        { element: <ModelManagement />, path: 'Model' },
        // { element: <Test />, path: 'Test' },
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
