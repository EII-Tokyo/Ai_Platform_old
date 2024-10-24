import * as React from 'react';
import { BrowserRoute, MobileRoute } from './route/route';
import { BrowserRouter } from 'react-router-dom';
import { BrowserView, MobileView } from 'react-device-detect';
export default function App() {
  return (
    <BrowserRouter>
      <BrowserView>
        <BrowserRoute />
      </BrowserView>
      <MobileView>
        <MobileRoute />
      </MobileView>
    </BrowserRouter>
  );
}
