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
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatmapRef = useRef(null);

  useEffect(() => {
    const loadMapScript = () => {
      if (window.AMap) {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://webapi.amap.com/maps?v=2.0&key=e655274e006f2179bbe5154def48513b&plugin=AMap.HeatMap';
      script.onload = initMap;
      script.onerror = () => console.error('高德地图脚本加载失败');
      document.body.appendChild(script);
    };

    const initMap = () => {
      const { AMap } = window;

      const map = new AMap.Map(mapRef.current, {
        center: [104.114129, 37.550339],
        zoom: 5,
        mapStyle: 'amap://styles/grey',
        viewMode: '2D',
        dragEnable: true,
        zoomEnable: true,
        doubleClickZoom: true,
        keyboardEnable: false,
        jogEnable: false,
        scrollWheel: true,
        touchZoom: true,
        showIndoorMap: false,
        showBuildingBlock: false,
        showLabel: true,
        defaultCursor: 'default',
        limitBounds: new AMap.Bounds(
          [73.446960, 18.158695],
          [135.085831, 53.558656]
        ),
        zoomLimit: [4, 18]
      });
      mapInstanceRef.current = map;

      // 地图初始化后，如果activities数据已经存在，可以尝试创建热力图
      // 但更好的方式是依赖activities的useEffect来处理热力图更新
    };

    loadMapScript();

    // 清理函数：在组件卸载时销毁地图实例，防止内存泄漏
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
        heatmapRef.current = null; // 清空热力图引用
      }
    };
  }, []); // 此useEffect仅在组件挂载和卸载时运行

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

  // 更新热力图数据
  useEffect(() => {
    // 确保地图实例和高德地图库已加载
    if (!mapInstanceRef.current || !window.AMap || !activities || activities.length === 0) {
      // 如果activities为空，但热力图存在，清除热力图
      if(heatmapRef.current) {
         heatmapRef.current.setDataSet({data: [], max: 100}); // 清空数据
      }
      mapInstanceRef.current?.clearMap(); // 清除其他图层（如城市标记）
      addCityMarkers(activities); // 即使activities为空，重新调用确保没有旧标记
      return;
    }

    const { AMap } = window;

    // 清除之前的非热力图图层（如城市标记）
    // 注意：这里不清除所有图层，只处理热力图之外的，热力图数据直接更新
    mapInstanceRef.current.clearMap(); // 此处清除城市标记，后面会重新添加

    // 准备热力图数据
    const heatmapData = activities.reduce((acc, activity) => {
      if (activity.map?.summaryPolyline) {
        const coordinates = decodePolyline(activity.map.summaryPolyline);
        coordinates.forEach(coord => {
          acc.push({
            lng: coord[1],
            lat: coord[0],
            count: 1
          });
        });
      }
      return acc;
    }, []);

    // console.log('Heatmap data:', heatmapData);

    // 创建或更新热力图实例
    if (heatmapRef.current) {
      // 如果热力图实例已存在，直接更新数据
      heatmapRef.current.setDataSet({
        data: heatmapData,
        max: 100
      });
    } else {
      // 如果热力图实例不存在，创建新的
      heatmapRef.current = new AMap.HeatMap(mapInstanceRef.current, {
        radius: 10, // 减小半径以呈现线条形式
        opacity: [0, 0.8],
        gradient: {
          0.2: '#00baff', // Light blue
          0.5: '#0077ff', // Medium blue
          0.8: '#0044ff', // Dark blue
          1.0: '#ffffff'  // White
        }
      });
       // 创建后立即设置数据
       heatmapRef.current.setDataSet({
          data: heatmapData,
          max: 100
       });
    }

    // 添加城市标记
    addCityMarkers(activities);

  }, [activities, mapInstanceRef.current]); // 依赖activities和地图实例

  // 处理选中活动的效果
  useEffect(() => {
     // 确保地图实例和高德地图库已加载
    if (!mapInstanceRef.current || !window.AMap ) {
        return;
    }

    // 在处理选中活动时，不清除热力图，只添加高亮轨迹
    // 需要先清除之前的高亮轨迹，但保留城市标记和热力图
    // 由于高德地图没有直接清除特定类型图层的方法，简单起见，我们只添加新的高亮轨迹
    // 如果需要清除，需要单独管理高亮轨迹的Overlay数组

    if (selectedActivity && selectedActivity.map?.summaryPolyline) {
      const { AMap } = window;

      const coordinates = decodePolyline(selectedActivity.map.summaryPolyline);
      const path = coordinates.map((coord) => new AMap.LngLat(coord[1], coord[0]));

      // 添加高亮轨迹
      const polyline = new AMap.Polyline({
        path: path,
        strokeColor: '#ffdb49',
        strokeWeight: 4,
        strokeOpacity: 0.8,
      });
      mapInstanceRef.current.add(polyline);

      // 调整视图到选中活动
      if (coordinates.length > 0) {
          const firstCoord = coordinates[0];
          mapInstanceRef.current.setCenter(new AMap.LngLat(firstCoord[1], firstCoord[0]));
          mapInstanceRef.current.setZoom(8, true, 500);
      }
    } else {
         // 如果没有选中活动，清除可能存在的高亮轨迹
         // 这是简化的处理，如果需要精确清除，需要跟踪高亮轨迹对象
         // 目前简单地在activities更新时clearMap会清除所有，这里只处理selectedActivity变化
         // 更好的方法是维护一个高亮轨迹的数组并在selectedActivity变化时移除旧的添加新的
    }

  }, [selectedActivity, mapInstanceRef.current]); // 依赖selectedActivity和地图实例

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '100vh',
        position: 'absolute',
        top: 0,
        left: 0
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