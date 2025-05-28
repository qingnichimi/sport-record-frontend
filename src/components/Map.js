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

const ActivityMap = ({ activities, selectedActivity }) => {
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
        center: [104.114129, 37.550339], // 中国中心经纬度
        zoom: 4, // 默认缩放级别，显示整个中国
        mapStyle: 'amap://styles/grey', // 设置地图的显示样式
        viewMode: '2D', // 使用2D模式
        dragEnable: true, // 允许拖拽
        zoomEnable: true, // 允许缩放
        doubleClickZoom: true, // 允许双击缩放
        keyboardEnable: false, // 禁用键盘操作
        jogEnable: false, // 禁用缓动效果
        scrollWheel: true, // 允许鼠标滚轮缩放
        touchZoom: true, // 允许触摸缩放
        showIndoorMap: false, // 不显示室内地图
        showBuildingBlock: false, // 不显示建筑物
        showLabel: true, // 显示地图文字标注
        defaultCursor: 'default', // 默认鼠标样式
        limitBounds: new AMap.Bounds(
          [73.446960, 18.158695], // 中国西南角坐标
          [135.085831, 53.558656]  // 中国东北角坐标
        ), // 限制地图显示范围在中国范围内
        zoomLimit: [3, 18] // 限制缩放级别
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

  // 添加城市标记点
  const addCityMarkers = (activities) => {
    if (!mapInstanceRef.current || !activities) return;

    const { AMap } = window;
    const cityMap = new Map(); // 用于存储城市信息

    // 统计每个城市的活动数量
    activities.forEach(activity => {
      if (activity.city) {
        if (!cityMap.has(activity.city)) {
          cityMap.set(activity.city, {
            count: 1,
            coordinates: [activity.startLatlng[0], activity.startLatlng[1]]
          });
        } else {
          const cityInfo = cityMap.get(activity.city);
          cityInfo.count += 1;
        }
      }
    });

    // 为每个城市创建标记
    cityMap.forEach((info, cityName) => {
      const marker = new AMap.Marker({
        position: new AMap.LngLat(info.coordinates[1], info.coordinates[0]),
        content: `<div style="
          background-color: rgba(44, 62, 80, 0.8);
          color: #E0E0E0;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: ${Math.min(12 + info.count, 20)}px;
          white-space: nowrap;
          border: 1px solid #ffdb49;
        ">${cityName} (${info.count})</div>`,
        offset: new AMap.Pixel(-10, -10),
        anchor: 'bottom-center'
      });

      mapInstanceRef.current.add(marker);
    });
  };

  // 绘制活动轨迹
  useEffect(() => {
    if (!mapInstanceRef.current || !activities || activities.length === 0) return;

    const { AMap } = window;

    // 清除之前的轨迹
    mapInstanceRef.current.clearMap();
    
    // 添加城市标记
    addCityMarkers(activities);

    // 遍历活动数据，绘制每条轨迹
    activities.forEach((activity) => {
      if (activity.map?.summaryPolyline) {
        const coordinates = decodePolyline(activity.map.summaryPolyline);
        const path = coordinates.map((coord) => new AMap.LngLat(coord[1], coord[0]));
        const strokeColor = activityTypeColors[activity.type] || '#808080';
        const polyline = new AMap.Polyline({
          path: path,
          strokeColor: strokeColor,
          strokeWeight: 2,
          strokeOpacity: 0.8,
        });
        mapInstanceRef.current.add(polyline);
      }
    });
  }, [activities]);

  useEffect(() => {
    if (selectedActivity && mapInstanceRef.current) {
      // 清除之前的轨迹并绘制选中的活动轨迹
      mapInstanceRef.current.clearMap();

      // 重新添加城市标记
      addCityMarkers(activities);

      if (selectedActivity.map?.summaryPolyline) {
        const { AMap } = window;
        const coordinates = decodePolyline(selectedActivity.map.summaryPolyline);
        const path = coordinates.map((coord) => new AMap.LngLat(coord[1], coord[0]));
        const strokeColor = activityTypeColors[selectedActivity.type] || '#808080';

        const polyline = new AMap.Polyline({
          path: path,
          strokeColor: strokeColor,
          strokeWeight: 3,
          strokeOpacity: 0.8,
        });
        mapInstanceRef.current.add(polyline);
        
        const firstCoord = coordinates[0];
        mapInstanceRef.current.setCenter(new AMap.LngLat(firstCoord[1], firstCoord[0]));
        mapInstanceRef.current.setZoom(8, true, 500);
      }
    }
  }, [selectedActivity]);

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
ActivityMap.propTypes = {
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


export default ActivityMap;