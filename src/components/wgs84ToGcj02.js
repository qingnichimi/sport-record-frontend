// WGS84 to GCJ02 (火星坐标)
const wgs84ToGcj02 = (longitude, latitude) => {
    const pi = Math.PI;
    const a = 6378245; // 长半轴
    const ee = 0.006693421622965943; // 偏心率平方
  
    const transformLat = (x, y) => {
      let ret =
        -100.0 +
        2.0 * x +
        3.0 * y +
        0.2 * y * y +
        0.1 * x * y +
        0.2 * Math.sqrt(Math.abs(x));
      ret +=
        (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
      ret +=
        (20.0 * Math.sin(y * pi) + 40.0 * Math.sin(y / 3.0 * pi)) * 2.0 / 3.0;
      ret +=
        (160.0 * Math.sin(y / 12.0 * pi) + 320 * Math.sin(y * pi / 30.0)) * 2.0 / 3.0;
      return ret;
    };
  
    const transformLon = (x, y) => {
      let ret =
        300.0 +
        x +
        2.0 * y +
        0.1 * x * x +
        0.1 * x * y +
        0.1 * Math.sqrt(Math.abs(x));
      ret +=
        (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
      ret +=
        (20.0 * Math.sin(x * pi) + 40.0 * Math.sin(x / 3.0 * pi)) * 2.0 / 3.0;
      ret +=
        (150.0 * Math.sin(x / 12.0 * pi) + 300.0 * Math.sin(x / 30.0 * pi)) *
        2.0 /
        3.0;
      return ret;
    };
  
    const outOfChina = (lon, lat) => {
      return (
        lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271
      );
    };
  
    if (outOfChina(longitude, latitude)) {
      return [longitude, latitude];
    }
  
    let dLat = transformLat(longitude - 105.0, latitude - 35.0);
    let dLon = transformLon(longitude - 105.0, latitude - 35.0);
    const radLat = (latitude / 180.0) * pi;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * pi);
    dLon = (dLon * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * pi);
    const mgLat = latitude + dLat;
    const mgLon = longitude + dLon;
  
    return [mgLon, mgLat];
  };
  
export default wgs84ToGcj02;