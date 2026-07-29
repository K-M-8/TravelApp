import React, { useState, useEffect } from 'react';
import { Plane, Hotel, Ticket, Loader, MapPin, TrendingUp, ChevronLeft } from 'lucide-react';

// --- MOCK DATA FOR DISPLAY ---
// In a production app, Flask would fetch this from a 'hotels' table/API.
const mockHotels = [
    { id: 1, name: "The Cozy Nook Inn", stars: 4, price: 150, rating: 4.5, description: "A quiet boutique stay near the city center, highly recommended." },
    { id: 2, name: "Luxury Sky Tower", stars: 5, price: 350, rating: 4.8, description: "Unmatched views and premium services for a grand experience." },
    { id: 3, name: "Budget Traveler Hostel", stars: 2, price: 45, rating: 3.9, description: "Clean and affordable, great for solo adventurers." },
];

// In a production app, Flask would fetch this from a 'tickets' table/API.
const mockTickets = [
    { id: '1A', name: "City Walls Guided Tour", price: 25, available: true, link: "#" },
    { id: '2B', name: "London Eye Fast Pass", price: 40, available: true, link: "#" },
    { id: '4D', name: "Tate Modern Entrance Fee", price: 0, available: true, link: "#" },
];

// --- APP COMPONENT ---

const App = () => {
    // State for navigation (page) and data
    const [page, setPage] = useState('input'); // 'input', 'itinerary', 'hotels', 'tickets'
    const [itineraryData, setItineraryData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    const [city, setCity] = useState('London');
    const [time, setTime] = useState(8);
    const [interests, setInterests] = useState(['history', 'coffee']);
    
    // --- UTILITY ---
    const BASE_URL = 'http://127.0.0.1:8080'; 

    const toggleInterest = (interest) => {
        setInterests(prev => 
            prev.includes(interest) 
                ? prev.filter(i => i !== interest) 
                : [...prev, interest]
        );
    };

    // --- API CALL ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setItineraryData(null);

        try {
            const response = await fetch(`${BASE_URL}/generate_itinerary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    city,
                    time_available_hours: parseInt(time),
                    interests
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to generate itinerary.");
            }

            setItineraryData(result.itinerary);
            setPage('itinerary'); // Navigate to the itinerary view on success

        } catch (err) {
            setError(`Oops! Something went wrong. Details: ${err.message}. Check your Flask server logs.`);
        } finally {
            setLoading(false);
        }
    };
    
    // --- COMPONENTS ---

    const Header = () => (
        <div className="flex justify-between items-center p-4 bg-gray-900 shadow-xl text-white rounded-t-xl">
            {page !== 'input' && (
                <button 
                    onClick={() => setPage('itinerary')}
                    className="p-2 rounded-full hover:bg-gray-800 transition duration-150"
                >
                    <ChevronLeft size={24} />
                </button>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center">
                <Plane className="mr-2" /> Travel Genie Portal
            </h1>
            <div className="w-10"></div> 
        </div>
    );
    
    const ItineraryView = () => {
        if (!itineraryData) return null;

        return (
            <div className="p-6 space-y-8">
                <div className="flex space-x-4">
                    <button 
                        onClick={() => setPage('hotels')}
                        className="flex-1 flex items-center justify-center p-4 bg-yellow-600 text-white font-semibold rounded-xl shadow-lg hover:bg-yellow-700 transition"
                    >
                        <Hotel className="mr-2" size={20} /> View Hotels
                    </button>
                    <button 
                        onClick={() => setPage('tickets')}
                        className="flex-1 flex items-center justify-center p-4 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition"
                    >
                        <Ticket className="mr-2" size={20} /> Buy Tickets
                    </button>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
                    <h2 className="text-xl font-bold mb-2 text-indigo-700">Your Personalized Day</h2>
                    <p className="text-gray-600 italic">"{itineraryData.summary}"</p>
                </div>
                
                <ol className="relative border-l border-gray-200">
                    {itineraryData.schedule.map((step, index) => (
                        <li key={index} className="mb-8 ml-6">
                            <span className="absolute flex items-center justify-center w-6 h-6 bg-indigo-100 rounded-full -left-3 ring-8 ring-gray-50">
                                <MapPin className="w-3 h-3 text-indigo-600" />
                            </span>
                            <time className="block mb-2 text-sm font-semibold leading-none text-gray-500">{step.time}</time>
                            <h3 className="text-lg font-semibold text-gray-900">{step.activity}</h3>
                            <p className="text-base font-normal text-gray-600">Place ID: **{step.placeId}** (Used for ticket linking)</p>
                        </li>
                    ))}
                </ol>
            </div>
        );
    };
    
    const HotelsView = () => (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Hotel className="mr-3 text-yellow-600" size={24} /> Recommended Stays in {city}
            </h2>
            <div className="space-y-4">
                {mockHotels.map(hotel => (
                    <div key={hotel.id} className="bg-white p-5 rounded-xl shadow-md border-l-4 border-yellow-500">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">{hotel.name}</h3>
                            <span className="px-3 py-1 text-sm font-bold text-white bg-yellow-500 rounded-full">${hotel.price} / night</span>
                        </div>
                        <p className="text-gray-600 mb-2">{hotel.description}</p>
                        <div className="text-sm text-gray-500">
                            Rating: {hotel.rating} / 5.0 | {hotel.stars} Stars
                        </div>
                        <button className="mt-3 w-full py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition">
                            Book Now
                        </button>
                    </div>
                ))}
            </div>
            <button 
                onClick={() => setPage('itinerary')}
                className="mt-6 w-full py-3 bg-indigo-500 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-600 transition"
            >
                Back to Itinerary
            </button>
        </div>
    );

    const TicketsView = () => (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Ticket className="mr-3 text-blue-600" size={24} /> Tickets & Experiences
            </h2>
            <p className="text-gray-600 mb-6">
                Directly purchase tickets for places recommended in your itinerary (or popular spots).
            </p>
            <div className="space-y-4">
                {mockTickets.map(ticket => {
                    // Check if this ticket is directly recommended in the itinerary
                    const isRecommended = itineraryData?.schedule.some(step => step.placeId === ticket.id);
                    return (
                        <div key={ticket.id} className={`bg-white p-5 rounded-xl shadow-md border-l-4 ${isRecommended ? 'border-green-500' : 'border-gray-300'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-semibold text-gray-900">{ticket.name}</h3>
                                <span className="px-3 py-1 text-sm font-bold text-white bg-blue-500 rounded-full">${ticket.price}</span>
                            </div>
                            {isRecommended && (
                                <p className="text-sm font-medium text-green-600 mb-2 flex items-center">
                                    <TrendingUp size={16} className="mr-1"/> Recommended in your Itinerary!
                                </p>
                            )}
                            <a 
                                href={ticket.link} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 w-full block text-center py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition"
                            >
                                Purchase Ticket
                            </a>
                        </div>
                    );
                })}
            </div>
            <button 
                onClick={() => setPage('itinerary')}
                className="mt-6 w-full py-3 bg-indigo-500 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-600 transition"
            >
                Back to Itinerary
            </button>
        </div>
    );

    const InputForm = () => (
        <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Display */}
                {error && (
                    <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg font-medium" role="alert">
                        {error}
                    </div>
                )}
                
                {/* City Input */}
                <div>
                    <label htmlFor="city" className="block text-lg font-medium text-gray-700 mb-1">Destination City</label>
                    <input 
                        type="text" 
                        id="city" 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)}
                        required
                        className="w-full p-3 border border-gray-300 rounded-xl shadow-inner focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., London"
                    />
                </div>

                {/* Time Input */}
                <div>
                    <label htmlFor="time" className="block text-lg font-medium text-gray-700 mb-1">Time Available (Hours)</label>
                    <input 
                        type="number" 
                        id="time" 
                        value={time} 
                        onChange={(e) => setTime(e.target.value)}
                        min="1"
                        max="24"
                        required
                        className="w-full p-3 border border-gray-300 rounded-xl shadow-inner focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., 8"
                    />
                </div>

                {/* Interests Input (Tags) */}
                <div>
                    <label className="block text-lg font-medium text-gray-700 mb-2">Interests</label>
                    <div className="flex flex-wrap gap-2">
                        {['history', 'coffee', 'food', 'art', 'nature', 'views', 'local_gem'].map(interest => (
                            <button
                                key={interest}
                                type="button"
                                onClick={() => toggleInterest(interest)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition duration-150 ${
                                    interests.includes(interest)
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'bg-gray-200 text-gray-700 hover:bg-indigo-100'
                                }`}
                            >
                                {interest.charAt(0).toUpperCase() + interest.slice(1)}
                            </button>
                        ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Select at least one interest.</p>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || interests.length === 0}
                    className={`w-full py-4 text-xl font-bold rounded-xl shadow-lg transition duration-300 flex items-center justify-center ${
                        loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                    {loading ? (
                        <>
                            <Loader className="animate-spin mr-2" size={20} /> Generating Portal...
                        </>
                    ) : (
                        "Create My Travel Portal"
                    )}
                </button>
            </form>
        </div>
    );


    // --- ROUTING / PAGE RENDERING ---
    const renderPage = () => {
        switch (page) {
            case 'itinerary':
                return <ItineraryView />;
            case 'hotels':
                return <HotelsView />;
            case 'tickets':
                return <TicketsView />;
            case 'input':
            default:
                return <InputForm />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <script src="https://cdn.tailwindcss.com"></script>
            <div className="max-w-xl mx-auto py-8">
                <div className="bg-white rounded-xl shadow-2xl">
                    <Header />
                    {renderPage()}
                </div>
            </div>
        </div>
    );
};

export default App;
