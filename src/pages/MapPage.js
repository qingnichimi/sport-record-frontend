import {
  Box,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography
} from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import StravaService from '../api/strava';
import ActivityMap from '../components/Map';

const TransparentPaper = styled(Paper)({
  backgroundColor: '#2c3e50',
  boxShadow: 'none',
  color: '#E0E0E0',
  height: '100%',
  overflow: 'auto'
});

const StatValue = styled(Typography)({
  color: '#ffdb49',
  fontSize: '1.5rem',
  fontWeight: 'bold',
  marginBottom: '16px'
});

const StatLabel = styled(Typography)({
  color: '#E0E0E0',
  fontSize: '0.9rem',
  marginBottom: '4px'
});

const ListTitle = styled(Typography)({
  color: '#E0E0E0',
  fontSize: '1.1rem',
  fontWeight: 'bold',
  marginTop: '16px',
  marginBottom: '8px'
});

const MapPage = () => {
  const [activities, setActivities] = useState([]);
  const [statistics, setStatistics] = useState({
    totalActivities: 0,
    cityCount: 0,
    totalDistance: 0,
    currentYearDistance: 0,
    typeStats: [],
    yearlyStats: []
  });

  const stravaService = new StravaService();
  const location = useLocation();

  const handleAuthorize = () => {
    const scopes = 'activity:read_all';
    const url = stravaService.getAuthorizationUrl(scopes);
    window.location.href = url;
  };

  const fetchActivities = async () => {
    try {
      const res = await stravaService.getActivities(1, 100);
      if (res.code === 401) {
        handleAuthorize();
        return;
      }
      setActivities(res.data);
      // 获取活动数据后同时获取统计数据
      await fetchStatistics();
    } catch (error) {
      console.error('获取 Strava 活动失败:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('stravaTokens');
        handleAuthorize();
      }
    }
  };

  const fetchStatistics = async () => {
    try {
      const res = await stravaService.getActivityStatistics();
      if (res.code === 200) {
        setStatistics({
          totalActivities: res.data.totalActivities,
          cityCount: res.data.totalCity,
          totalDistance: res.data.totalDistance,
          currentYearDistance: res.data.currentYearDistance,
          distanceByYear: res.data.distanceByYear || [],
          distanceByType: res.data.distanceByType || []
        });
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

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
        window.location.replace(window.location.pathname);
      }
    } catch (e) {
      console.error('获取token失败:', e);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      position: 'fixed',
      margin: 0,
      padding: 0,
      gap: '1px'
    }}>
      {/* 左侧统计区域 (30%) */}
      <div style={{ 
        flex: '3',
        height: '100vh',
        backgroundColor: '#2c3e50',
        display: 'flex',
        flexDirection: 'column',
        marginLeft: '2px'
      }}>
        <TransparentPaper style={{ flex: 1, overflow: 'hidden' }}>
          <Box p={2} style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <Grid 
              container 
              spacing={2} 
              style={{ 
                flex: 1,
                overflow: 'auto',
                paddingRight: '4px'
              }}
            >
              {/* 总活动数 */}
              <Grid item xs={6}>
                <StatLabel>总次数</StatLabel>
                <StatValue>{statistics.totalActivities}</StatValue>
              </Grid>

              {/* 总里程 */}
              <Grid item xs={6}>
                <StatLabel>总里程</StatLabel>
                <StatValue>{statistics.totalDistance} km</StatValue>
              </Grid>

              {/* 本年度里程 */}
              <Grid item xs={6}>
                <StatLabel>本年里程</StatLabel>
                <StatValue>{statistics.currentYearDistance} km</StatValue>
              </Grid>

              {/* 运动城市数量 */}
              <Grid item xs={6}>
                <StatLabel>城市数量</StatLabel>
                <StatValue>{statistics.cityCount}</StatValue>
              </Grid>

              {/* 运动类型统计 */}
              <Grid item xs={12}>
                <ListTitle>运动类型</ListTitle>
                <List>
                  {Object.entries(statistics.distanceByType || {}).map(([type, distance], index, array) => (
                    <React.Fragment key={type}>
                      <ListItem>
                        <ListItemText 
                          primary={type}
                          secondary={`${distance} km`}
                          primaryTypographyProps={{ style: { color: '#E0E0E0' } }}
                          secondaryTypographyProps={{ style: { color: '#ffdb49' } }}
                        />
                      </ListItem>
                      {index < array.length - 1 && <Divider style={{ backgroundColor: '#34495e' }} />}
                    </React.Fragment>
                  ))}
                </List>
              </Grid>

              {/* 年度统计 */}
              <Grid item xs={12}>
                <ListTitle>年度统计</ListTitle>
                <List>
                  {Object.entries(statistics.distanceByYear || {}).map(([year, distance], index, array) => (
                    <React.Fragment key={year}>
                      <ListItem>
                        <ListItemText 
                          primary={`${year}年`}
                          secondary={`${distance} km`}
                          primaryTypographyProps={{ style: { color: '#E0E0E0' } }}
                          secondaryTypographyProps={{ style: { color: '#ffdb49' } }}
                        />
                      </ListItem>
                      {index < array.length - 1 && <Divider style={{ backgroundColor: '#34495e' }} />}
                    </React.Fragment>
                  ))}
                </List>
              </Grid>
            </Grid>
          </Box>
        </TransparentPaper>
      </div>

      {/* 右侧地图区域 (70%) */}
      <div style={{ 
        flex: '7',
        position: 'relative',
        height: '100vh'
      }}>
        <ActivityMap activities={activities} />
      </div>
    </div>
  );
};

export default MapPage;
