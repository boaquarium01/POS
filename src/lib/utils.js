// src/lib/utils.js

/**
 * 全系統統一台灣時間格式化工具 (+8)
 * @param {string} dateString - 從 Supabase 抓回來的原始時間字串
 * @returns {string} - 格式化後的繁體中文時間
 */
export const formatTWDate = (dateString) => {
  if (!dateString) return '';
  
  return new Date(dateString).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour12: false, // 使用 24 小時制
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};