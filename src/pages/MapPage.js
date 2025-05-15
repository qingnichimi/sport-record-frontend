import {
  Box,
  Button,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography
} from '@mui/material'; // 引入 MUI 组件
import { styled } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocation } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StravaService from '../api/strava'; // 引入封装的 Strava API 服务
import Map from '../components/Map';

const TransparentPaper = styled(Paper)({
  backgroundColor: '#2c3e50', // 使用深色背景
  boxShadow: 'none', // 去掉阴影
  color: '#E0E0E0', // 修改为柔和的浅灰色
});
const StyledTableCell = styled(TableCell)({
  color: '#E0E0E0', // 修改为柔和的浅灰色
});
// 自定义 TableContainer 组件，设置滚动条样式
const CustomTableContainer = styled(TableContainer)({
  '&::-webkit-scrollbar': {
    width: '1px', // 调整滚动条宽度
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#ffdb49', // 设置滚动条颜色
    borderRadius: '1px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
const StyledTableRow = styled(TableRow)(({ theme, isSelected }) => ({
  backgroundColor: isSelected ? '#2c3e50' : 'transparent', // 选中时的背景色
  '&:hover': {
    backgroundColor: isSelected ? '#2c3e50' : '#34495e', // 悬浮效果
  },
  cursor: 'pointer', // 鼠标悬浮时显示为指针
}));
// 自定义滚动条样式
const CustomScrollContainer = styled('div')({
  '&::-webkit-scrollbar': {
    width: '1px', // 调整滚动条宽度
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#E0E0E0', // 设置滚动条颜色
    borderRadius: '1px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

const MapPage = () => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showList, setShowList] = useState(true); // 控制列表显示状态
  const [selectedActivity, setSelectedActivity] = useState(null); // 选中的活动
  const [trainingSuggestion, setTrainingSuggestion] = useState(''); // 训练建议
  const [activeTab, setActiveTab] = useState(0); // 控制选中的 Tab
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false); // 加载状态
  const [chartData, setChartData] = useState([]);

  const stravaService = new StravaService();
  const location = useLocation();

  // 处理授权的方法
  const handleAuthorize = () => {
    const scopes = 'activity:read_all';
    const url = stravaService.getAuthorizationUrl(scopes);
    window.location.href = url;
  };

  // 获取活动数据
  const fetchActivities = async () => {
    try {
      const res = await stravaService.getActivities(1, 10);
      if (res.code === 401) {
        handleAuthorize();
        return;
      }
      setActivities(res.data);
      setIsLoading(false);
      setChartData(processChartData(res.data));
    } catch (error) {
      console.error('获取 Strava 活动失败:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('stravaTokens');
        handleAuthorize();
      }
      setIsLoading(false);
    }
  };

  // 获取训练建议
  const fetchTrainingSuggestion = async () => {
    try {
      setIsLoadingSuggestion(true);
      const res = await stravaService.getTrainingSuggestion();
      if (res.code === 401) {
        handleAuthorize();
        return;
      }
      setTrainingSuggestion(res.data);
    } catch (error) {
      setTrainingSuggestion('获取训练建议失败，请稍后重试');
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // 当切换到训练建议标签时获取建议
  useEffect(() => {
    if (activeTab === 1) {
      fetchTrainingSuggestion();
    }
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code) {
      fetchToken(code);
    } else {
      fetchActivities();
    }
  }, []);

  const fetchToken = async (code) => {
    try {
      const res = await stravaService.getTokenByCode(code);
      if (res.code === 200) {
        // 使用 replace 强制替换当前 URL
        window.location.replace(window.location.pathname);
      } else {
        // 处理获取token失败
      }
    } catch (e) {
      // 处理异常
    }
  };

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity); // 设置选中的活动
  };
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // tab切换时重新获取数据
    if (newValue === 0) {
      fetchActivities();
    } else if (newValue === 1) {
      fetchTrainingSuggestion();
    }
  };

  const processChartData = (activities) => {
    return activities.map(activity => ({
      date: new Date(activity.startDateLocal).toLocaleDateString(),
      distance: activity.distance / 1000,
      pace: activity.averageSpeed * 3.6
    }));
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      position: 'fixed',
      margin: 0, // 移除边距
      padding: 0 // 移除内边距
    }}>
      {/* 左侧活动列表 */}
      <div style={{
          position: 'fixed',
          top: '20px',
          left: '5px',
          padding: '20px',
          borderRadius: '8px',
          maxHeight: '80vh',
          maxWidth: '40%',
          width: '100%',
          overflowY: 'auto',
          zIndex: 1000,
          margin: 0,
          backgroundColor: '#2c3e50',
          '@media (max-width: 768px)': {
            maxWidth: '90%',
            left: '50%',
            transform: 'translateX(-50%)',
            top: '10px',
            padding: '10px'
          }
        }}
      >
        <Button variant="contained" color="primary" onClick={() => setShowList(!showList)}>
          {showList ? '隐藏' : '显示'}
        </Button>
        {showList && (isLoading ? (
          <div>加载中...</div>
        ) : (
          <>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="activity and suggestion tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab 
                label="活动列表" 
                sx={{
                  color: '#ffdb49',
                  '&.Mui-selected': {
                    color: '#ffdb49',
                  },
                  '@media (max-width: 768px)': {
                    fontSize: '0.8rem',
                    padding: '6px 12px'
                  }
                }}
              />
              <Tab 
                label="训练建议" 
                sx={{
                  color: '#ffdb49',
                  '&.Mui-selected': {
                    color: '#ffdb49',
                  },
                  '@media (max-width: 768px)': {
                    fontSize: '0.8rem',
                    padding: '6px 12px'
                  }
                }}
              />
            </Tabs>
            {activeTab === 0 && (
              <div>
                {isLoading ? (
                  <div>加载中...</div>
                ) : (
                  <>
                    <CustomTableContainer 
                      component={TransparentPaper} 
                      style={{ 
                        marginTop: '10px',
                        maxHeight: 'calc(80vh - 200px)',
                        overflow: 'auto',
                        '@media (max-width: 768px)': {
                          maxHeight: 'calc(80vh - 150px)'
                        }
                      }}
                    >
                      <Table aria-label="活动列表" size="small">
                        <TableHead>
                          <TableRow>
                            <StyledTableCell>名称</StyledTableCell>
                            <StyledTableCell>类型</StyledTableCell>
                            <StyledTableCell>日期</StyledTableCell>
                            <StyledTableCell>距离</StyledTableCell>
                            <StyledTableCell>配速</StyledTableCell>
                            <StyledTableCell>心率</StyledTableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {activities && activities.length > 0 ? (
                            activities.map((activity) => (
                              <StyledTableRow 
                                key={activity.id} 
                                onClick={() => handleActivityClick(activity)}
                                sx={{
                                  '@media (max-width: 768px)': {
                                    '& td': {
                                      padding: '8px',
                                      fontSize: '0.8rem'
                                    }
                                  }
                                }}
                              >
                                <StyledTableCell>{activity.name}</StyledTableCell>
                                <StyledTableCell>{activity.type}</StyledTableCell>
                                <StyledTableCell>{activity.startDateLocal}</StyledTableCell>
                                <StyledTableCell>{(activity.distance / 1000).toFixed(2)}</StyledTableCell>
                                <StyledTableCell>{(activity.averageSpeed * 3.6).toFixed(2) || 'N/A'}</StyledTableCell>
                                <StyledTableCell>{activity.averageHeartrate || 'N/A'}</StyledTableCell>
                              </StyledTableRow>
                            ))
                          ) : (
                            <StyledTableRow>
                              <StyledTableCell colSpan={6}>没有活动</StyledTableCell>
                            </StyledTableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CustomTableContainer>
                    <Box sx={{ mb: 2, height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Line yAxisId="left" type="monotone" dataKey="distance" stroke="#ffdb49" name="距离(km)" />
                          <Line yAxisId="right" type="monotone" dataKey="pace" stroke="#E0E0E0" name="配速(km/h)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </>
                )}
              </div>
            )}
            {/* 训练建议 Tab */}
            {activeTab === 1 && (
              <CustomScrollContainer style={{ 
                marginTop: '10px',
                maxHeight: 'calc(80vh - 200px)',
                overflow: 'auto',
                '@media (max-width: 768px)': {
                  maxHeight: 'calc(80vh - 150px)'
                }
              }}>
                {isLoadingSuggestion ? (
                  <Typography style={{ color: '#E0E0E0' }}>加载中...</Typography>
                ) : (
                  <div style={{ width: '100%' }}>
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <Typography variant="h5" style={{ color: '#E0E0E0', marginTop: '16px', marginBottom: '8px', '@media (max-width: 768px)': { fontSize: '1.2rem' } }} {...props} />,
                        h2: ({node, ...props}) => <Typography variant="h6" style={{ color: '#E0E0E0', marginTop: '12px', marginBottom: '6px', '@media (max-width: 768px)': { fontSize: '1.1rem' } }} {...props} />,
                        h3: ({node, ...props}) => <Typography variant="subtitle1" style={{ color: '#E0E0E0', marginTop: '8px', marginBottom: '4px', '@media (max-width: 768px)': { fontSize: '1rem' } }} {...props} />,
                        p: ({node, ...props}) => <Typography style={{ color: '#E0E0E0', marginBottom: '8px', '@media (max-width: 768px)': { fontSize: '0.9rem' } }} {...props} />,
                        ul: ({node, ...props}) => <ul style={{ color: '#E0E0E0', marginLeft: '20px', marginBottom: '8px', '@media (max-width: 768px)': { marginLeft: '16px' } }} {...props} />,
                        li: ({node, ...props}) => <li style={{ color: '#E0E0E0', marginBottom: '4px', '@media (max-width: 768px)': { fontSize: '0.9rem' } }} {...props} />,
                        strong: ({node, ...props}) => <strong style={{ color: '#E0E0E0' }} {...props} />,
                        em: ({node, ...props}) => <em style={{ color: '#E0E0E0' }} {...props} />,
                      }}
                    >
                      {trainingSuggestion || '暂无建议'}
                    </ReactMarkdown>
                  </div>
                )}
              </CustomScrollContainer>
            )}
          </>
        ))}
      </div>
      {/* 右侧地图 */}
      <div style={{ flex: 1, position: 'relative', height: '100vh' }}>
        <Map activities={activities} selectedActivity={selectedActivity}/>
      </div>
    </div>
  );
};

export default MapPage;
