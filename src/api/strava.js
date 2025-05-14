import axios from 'axios';

class StravaService {
  constructor() {
    this.clientId = process.env.REACT_APP_STRAVA_CLIENT_ID;
    this.redirectUri = process.env.REACT_APP_STRAVA_REDIRECT_URI;
    this.apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  // 获取授权URL
  getAuthorizationUrl(scopes) {
    return `https://www.strava.com/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${scopes}&approval_prompt=force`;
  }

  // 获取活动数据
  async getActivities(page = 1, pageSize = 10) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/api/strava/athlete/activity/list`, {
        params: {
          page,
          pageSize
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching activities:', error.response?.data || error.message);
      throw error;
    }
  }

  async getActivityDetails(activityId) {
    const response = await fetch(`${this.apiBaseUrl}/api/strava/athlete/activity/${activityId}`);
    return await response.json();
  }

  // 获取训练建议
  async getTrainingSuggestion() {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/api/training/suggestion`);
      return response.data;
    } catch (error) {
      console.error('Error fetching training suggestion:', error.response?.data || error.message);
      throw error;
    }
  }

  async getTokenByCode(code) {
    const response = await axios.post(`${this.apiBaseUrl}/api/strava/getAccessToken?code=${code}`);
    return response.data;
  }
}

export default StravaService;
