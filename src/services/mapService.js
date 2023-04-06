import axios from "axios";
import { mapboxAccessToken, RIDING_MODE } from "../constants";
class MapService {
  static mapAPi = axios.create({
    baseURL: process.env.REACT_APP_MAP_API_BASE_URL,
  });

  static mode = RIDING_MODE;
  static accessToken = process.env.REACT_APP_MAP_API_ACCESS_TOKEN;

  static async getRoute({ startLong, startLatt, endLong, endLatt }) {
    try {
      const response = await this.mapAPi.get(
        `/${this.mode}/${startLong},${startLatt};${endLong},${endLatt}?steps=true&geometries=geojson&access_token=${this.accessToken}`
      );
      return { data: response?.data, hasError: false, error: null };
    } catch (error) {
      return { data: null, hasError: true, error: error.response };
    }
  }
}

export default MapService;
