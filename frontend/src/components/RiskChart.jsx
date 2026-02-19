import { Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const RiskChart = ({ distribution }) => {
    const { high = 0, medium = 0, low = 0 } = distribution || {};

    const doughnutData = {
        labels: ['High Risk', 'Medium Risk', 'Low Risk'],
        datasets: [
            {
                data: [high, medium, low],
                backgroundColor: [
                    'hsla(4, 90%, 58%, 0.8)',
                    'hsla(45, 100%, 51%, 0.8)',
                    'hsla(142, 71%, 45%, 0.8)',
                ],
                borderColor: [
                    'hsl(4, 90%, 58%)',
                    'hsl(45, 100%, 51%)',
                    'hsl(142, 71%, 45%)',
                ],
                borderWidth: 2,
            },
        ],
    };

    const barData = {
        labels: ['High', 'Medium', 'Low'],
        datasets: [
            {
                label: 'Module Count',
                data: [high, medium, low],
                backgroundColor: [
                    'hsla(4, 90%, 58%, 0.6)',
                    'hsla(45, 100%, 51%, 0.6)',
                    'hsla(142, 71%, 45%, 0.6)',
                ],
                borderColor: [
                    'hsl(4, 90%, 58%)',
                    'hsl(45, 100%, 51%)',
                    'hsl(142, 71%, 45%)',
                ],
                borderWidth: 2,
                borderRadius: 8,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: 'hsl(0, 0%, 70%)',
                    padding: 15,
                    font: {
                        size: 12,
                        family: 'Inter',
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: 'hsl(0, 0%, 70%)',
                },
                grid: {
                    color: 'hsla(220, 14%, 20%, 0.5)',
                },
            },
            x: {
                ticks: {
                    color: 'hsl(0, 0%, 70%)',
                },
                grid: {
                    display: false,
                },
            },
        },
    };

    return (
        <div className="charts-container">
            <div className="chart-card">
                <h3>Risk Distribution</h3>
                <div className="chart-wrapper">
                    <Doughnut data={doughnutData} options={{ ...options, scales: undefined }} />
                </div>
            </div>

            <div className="chart-card">
                <h3>Risk Levels Comparison</h3>
                <div className="chart-wrapper">
                    <Bar data={barData} options={options} />
                </div>
            </div>
        </div>
    );
};

export default RiskChart;
