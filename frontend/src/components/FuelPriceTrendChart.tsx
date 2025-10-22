import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { apiGet } from "../utils/api";
import "../styles/FuelPriceTrendChart.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface TrendData {
  report_date: string;
  fuel_type: string;
  average_price: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: (number | null)[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

const FuelPriceTrendChart: React.FC<{ adminApiKey: string }> = ({
  adminApiKey,
}) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);

  useEffect(() => {
    const fetchTrendData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiGet(
          `/api/admin/price-reports/trends?days=${days}`,
          adminApiKey,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch trend data");
        }
        const data: TrendData[] = await response.json();

        const labels = [
          ...new Set(
            data.map((d) => new Date(d.report_date).toLocaleDateString()),
          ),
        ].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const fuelTypes = [...new Set(data.map((d) => d.fuel_type))];

        const datasets = fuelTypes.map((fuelType) => {
          const fuelTypeData = data.filter((d) => d.fuel_type === fuelType);
          return {
            label: fuelType,
            data: labels.map((label) => {
              const dataPoint = fuelTypeData.find(
                (d) => new Date(d.report_date).toLocaleDateString() === label,
              );
              return dataPoint ? parseFloat(dataPoint.average_price) : null;
            }),
            borderColor: getRandomColor(),
            backgroundColor: getRandomColor(0.5),
          };
        });

        setChartData({ labels, datasets });
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
        }
      } finally {
        setLoading(false);
      }
    };

    if (adminApiKey) {
      fetchTrendData();
    }
  }, [adminApiKey, days]);

  const getRandomColor = (alpha: number = 1) => {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  if (!adminApiKey) {
    return <div>Please enter an admin API key to view the chart.</div>;
  }

  if (loading) {
    return <div>Loading chart...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="fuel-price-trend-chart-container">
      <h3 className="chart-title">Fuel Price Trends</h3>
      <div className="time-range-selector">
        <label htmlFor="days-select">Time Range: </label>
        <select
          id="days-select"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>
      {chartData && (
        <Line
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: "top" as const,
              },
              title: {
                display: true,
                text: `Average Fuel Prices Over Last ${days} Days`,
              },
            },
            scales: {
              y: {
                beginAtZero: false,
                ticks: {
                  callback: function (value) {
                    return "₱" + value;
                  },
                },
              },
            },
          }}
        />
      )}
    </div>
  );
};

export default FuelPriceTrendChart;
