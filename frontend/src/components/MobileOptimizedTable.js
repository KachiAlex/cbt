import React, { useState, useMemo } from 'react';

/**
 * Mobile-Optimized Table Component
 * 
 * This component provides a responsive table that adapts to mobile screens
 * by showing cards on small screens and a traditional table on larger screens.
 */

const MobileOptimizedTable = ({ 
  data = [], 
  columns = [], 
  onRowClick = null,
  onSelectionChange = null,
  selectable = false,
  loading = false,
  emptyMessage = "No data available",
  className = ""
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Handle sorting
  const sortedData = useMemo(() => {
    if (!sortField) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(data.map((_, index) => index));
    } else {
      setSelectedItems([]);
    }
    onSelectionChange?.(checked ? data : []);
  };

  const handleSelectItem = (index, checked) => {
    let newSelection;
    if (checked) {
      newSelection = [...selectedItems, index];
    } else {
      newSelection = selectedItems.filter(i => i !== index);
    }
    setSelectedItems(newSelection);
    onSelectionChange?.(newSelection.map(i => data[i]));
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const renderMobileCard = (item, index) => (
    <div 
      key={index}
      className={`bg-white rounded-lg shadow-sm border p-4 mb-3 ${
        onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      } ${selectedItems.includes(index) ? 'ring-2 ring-blue-500' : ''}`}
      onClick={() => onRowClick?.(item, index)}
    >
      {selectable && (
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            checked={selectedItems.includes(index)}
            onChange={(e) => handleSelectItem(index, e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      <div className="space-y-2">
        {columns.map((column) => (
          <div key={column.key} className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-500 min-w-0 flex-shrink-0 mr-2">
              {column.title}:
            </span>
            <span className="text-sm text-gray-900 text-right min-w-0 flex-1">
              {column.render ? column.render(item[column.key], item, index) : item[column.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDesktopTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {selectable && (
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedItems.length === data.length && data.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.title}</span>
                  {column.sortable && renderSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((item, index) => (
            <tr
              key={index}
              className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${
                selectedItems.includes(index) ? 'bg-blue-50' : ''
              }`}
              onClick={() => onRowClick?.(item, index)}
            >
              {selectable && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(index)}
                    onChange={(e) => handleSelectItem(index, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
              )}
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {column.render ? column.render(item[column.key], item, index) : item[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No data</h3>
        <p className="mt-1 text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Mobile View */}
      <div className="block md:hidden">
        {sortedData.map((item, index) => renderMobileCard(item, index))}
      </div>
      
      {/* Desktop View */}
      <div className="hidden md:block">
        {renderDesktopTable()}
      </div>
    </div>
  );
};

export default MobileOptimizedTable;
