#  Global Asset & Stock Portfolio Tracker (PortfolioPilot)

<img width="1901" height="908" alt="Ekran görüntüsü 2026-08-09 180248" src="https://github.com/user-attachments/assets/9f5f6e8f-ea03-4695-81e4-4ec8359bb932" />
<img width="1898" height="906" alt="Ekran görüntüsü 2026-08-09 180321" src="https://github.com/user-attachments/assets/f21b9380-b70f-4230-98d7-e535d80781de" />


# Global Asset & TEFAS Portfolio Tracker (PortfolioPilot)


A modern, full-stack web application designed to track global financial assets (Stocks, Cryptocurrencies, ETFs) and Turkish Mutual Funds (TEFAS) in real-time. Built with a robust **.NET 8 Web API** backend and a lightning-fast **React** frontend, this project demonstrates scalable architecture, real-time data flow, dynamic web scraping, and modern UI/UX principles.

##  Key Features

* **Real-Time Data Integration:** Fetches and processes live market data for global assets (e.g., AAPL, TSLA, BTC-USD).
* **TEFAS Fund Scraping:** Automatically retrieves current prices for Turkish mutual funds (e.g., AFT, PBR, OJK, DBH) using dynamic web scraping as a robust fallback mechanism.
* **Trend Funds Carousel:** A dynamic, tabbed horizontal scrolling interface (Güncel Fonlar, En Çok İşlem Görenler, Global Fonlar) for categorizing and discovering top-performing funds.
* **Live Updates with SignalR:** WebSocket integration ensures that portfolio values and charts update instantly across connected clients without page reloads.
* **Smart Transaction Management:** Handles complex buy/sell logic, including partial asset liquidation and dynamic average cost calculation.
* **Interactive Data Visualization:** Dynamic, responsive pie charts and grid layouts for intuitive portfolio analysis.
* **Clean & Responsive UI:** Built with Tailwind CSS, featuring a sleek, dark-mode inspired financial dashboard with custom scrollbars and hover effects.

##  Tech Stack

**Frontend (Client)**
* **React 18** (Vite)
* **Tailwind CSS** (for utility-first styling and custom UI components)
* **Axios** (for API communication)
* **Recharts / Chart.js** (for data visualization)

**Backend (Server)**
* **.NET 8 Web API** (C#)
* **Entity Framework Core** (Code-First ORM)
* **SignalR** (Real-time WebSocket communication)
* **HtmlAgilityPack / HttpClient** (For TEFAS web scraping and external data fetching)
* **FluentValidation** (Strict API payload validation)
* **SQL Server** (Relational database management)

##  Architecture & Design Patterns

* **N-Tier Architecture:** Clean separation of concerns (API, Application, Domain, Infrastructure layers).
* **DTO (Data Transfer Object) Pattern:** Securing data encapsulation between the client and server.
* **Repository Pattern:** Abstracting database logic for scalable data access.
* **Asynchronous Programming:** Utilizing `async/await` for non-blocking I/O operations and optimized server performance.

##  Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
* SQL Server

### Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/EfkanB/portfolio-pilot.git](https://github.com/EfkanB/portfolio-pilot.git)


**Backend Setup**

Navigate to the API directory, restore packages, and update the database:

Bash

cd src/PortfolioPilot.WebAPI

dotnet restore

# JWT signing key is NOT stored in appsettings.json — set it once per machine (min. 32 chars):
dotnet user-secrets set "Jwt:Key" "<long-random-secret>"

dotnet ef database update

dotnet run

**Frontend Setup**

Open a new terminal tab, navigate to the frontend directory, install dependencies, and start the Vite development server:

Bash

cd frontend

npm install

npm run dev

**Running Tests**

From the repository root:

Bash

dotnet test PortfolioPilot.sln

## API Overview

All `/api/Portfolio` endpoints and the `/portfolioHub` SignalR hub require a JWT (`Authorization: Bearer <token>`; the hub accepts `?access_token=`). Price updates are pushed only to the users who hold the fund.

| Method | Route | Description |
|---|---|---|
| POST | `/api/Auth/register`, `/api/Auth/login` | Account & JWT |
| GET / POST | `/api/Portfolio` | List / create portfolios |
| DELETE | `/api/Portfolio/{id}` | Delete portfolio (funds + history) |
| POST | `/api/Portfolio/{id}/funds` | Buy (weighted average cost) |
| POST | `/api/Portfolio/{id}/funds/sell` | Sell `{ fundCode, quantity, price? }` — records realized P/L, rejects overselling |
| DELETE | `/api/Portfolio/{id}/funds/{fundId}` | Remove a position (data correction, not a sale) |
| GET | `/api/Portfolio/{id}/transactions` | Buy/sell history, newest first |
| GET | `/api/Tefas/funds`, `/api/Tefas/quote/{code}` | Public TEFAS quotes |
