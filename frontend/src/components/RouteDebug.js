import React from 'react';

const RouteDebug = () => {
  return (
    <div className="fixed top-4 right-4 bg-black text-white p-4 rounded-lg text-xs z-50">
      <div><strong>URL:</strong> {window.location.href}</div>
      <div><strong>Pathname:</strong> {window.location.pathname}</div>
      <div><strong>Search:</strong> {window.location.search}</div>
      <div><strong>Hash:</strong> {window.location.hash}</div>
    </div>
  );
};

export default RouteDebug; 