import PropTypes from 'prop-types';
import React, { useEffect, useRef } from 'react';

// 解码 Google Polyline 算法
const decodePolyline = (encoded) => {
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lat * 1e-5, lng * 1e-5]);
  }

  return coordinates;
};

const Map = ({ activities, selectedActivity }) => {
  const mapRef = useRef(null); // 存储地图 DOM 容器
  const mapInstanceRef = useRef(null); // 存储地图实例

  useEffect(() => {
    const loadMapScript = () => {
      if (window.AMap) {
        initMap(); // 如果高德地图脚本已加载，直接初始化地图
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://webapi.amap.com/maps?v=2.0&key=e655274e006f2179bbe5154def48513b';
      script.onload = initMap; // 脚本加载完成后初始化地图
      script.onerror = () => console.error('高德地图脚本加载失败');
      document.body.appendChild(script);
    };

    const initMap = () => {
      const { AMap } = window;

      // 初始化地图
      const map = new AMap.Map(mapRef.current, {
        center: [113.264385, 23.129112], // 广州市经纬度
        zoom: 11, // 默认缩放级别
        mapStyle: 'amap://styles/grey', // 设置地图的显示样式
      });
      mapInstanceRef.current = map;

    };

    loadMapScript();
  }, []); // 页面加载时初始化地图

  const activityTypeColors = {
    Run: '#FF0000', // 红色
    Ride: '#00FF00', // 蓝色
    // 添加其他活动类型和对应的颜色
  };
  // 绘制活动轨迹
  useEffect(() => {
    if (!mapInstanceRef.current || !activities || activities.length === 0) return;

    const { AMap } = window;

    // 清除之前的轨迹
    mapInstanceRef.current.clearMap();
    // 遍历活动数据，绘制每条轨迹
    activities.forEach((activity) => {
      if (activity.map?.summaryPolyline) {
        const coordinates = decodePolyline(activity.map.summaryPolyline); // 解码轨迹数据
        const path = coordinates.map((coord) => new AMap.LngLat(coord[1], coord[0])); // 转换为高德地图的经纬度格式
        // 获取活动类型对应的颜色，默认为灰色
        const strokeColor = activityTypeColors[activity.type] || '#808080';
        const polyline = new AMap.Polyline({
          path: path,
          strokeColor: strokeColor, // 轨迹颜色
          strokeWeight: 2, // 轨迹宽度
          strokeOpacity: 0.8, // 轨迹透明度
        });
        mapInstanceRef.current.add(polyline); // 将轨迹添加到地图
      }
    });

    // 调整地图视野以显示所有轨迹
    if (activities.length > 0) {
      const bounds = new AMap.Bounds();
      activities.forEach((activity) => {
        if (activity.map?.summaryPolyline) {
          const coordinates = decodePolyline(activity.map.summaryPolyline);
          coordinates.forEach((coord) => bounds.extend(new AMap.LngLat(coord[1], coord[0])));
        }
      });
      mapInstanceRef.current.setLimitBounds(bounds);
    }
  }, [activities]); // 当 activities 变化时重新绘制轨迹
  useEffect(() => {
    if (selectedActivity && mapInstanceRef.current) {
      // 清除之前的轨迹并绘制选中的活动轨迹
      mapInstanceRef.current.clearMap();

      if (selectedActivity.map?.summaryPolyline) {
        const { AMap } = window;
        const coordinates = decodePolyline(selectedActivity.map.summaryPolyline);
        const path = coordinates.map((coord) => new AMap.LngLat(coord[1], coord[0]));
        const strokeColor = activityTypeColors[selectedActivity.type] || '#808080';

        const polyline = new AMap.Polyline({
          path: path,
          strokeColor: strokeColor, // 轨迹颜色
          strokeWeight: 3, // 轨迹宽度
          strokeOpacity: 0.8, // 轨迹透明度
        });
        mapInstanceRef.current.add(polyline);
        
        // 定位到轨迹的起始点并设置固定缩放级别
        const firstCoord = coordinates[0];
        mapInstanceRef.current.setCenter(new AMap.LngLat(firstCoord[1], firstCoord[0]));
        mapInstanceRef.current.setZoom(16.5, true, 500);
      }
    }
  }, [selectedActivity]); // 选中的活动变化时，重新绘制
  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100vh', // 使用视口高度
        position: 'absolute', // 绝对定位
        top: 0, // 顶部对齐
        left: 0 // 左侧对齐
      }} 
    />
  );
};

// 添加 PropTypes 验证
Map.propTypes = {
  activities: PropTypes.arrayOf(
    PropTypes.shape({
      map: PropTypes.shape({
        summaryPolyline: PropTypes.string, // 活动轨迹数据
      }),
    })
  ),
  selectedActivity: PropTypes.shape({
    map: PropTypes.shape({
      summaryPolyline: PropTypes.string,
    }),
    type: PropTypes.string,
  }),
};


export default Map;