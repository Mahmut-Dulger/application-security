import Head from "next/head";
import { useState, useEffect } from "react";
import { Holiday } from "@types";
import Header from "@components/header";
import TripService from "@services/TripService";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";

const Trips: React.FC = () => {
  const [error, setError] = useState<string>();
  const [trips, setTrips] = useState<Holiday[]>([]);

// Add state for trips and update it when fetching data.
// Properly handle async fetch and JSON parsing.
// Render the list of trips using the fetched data.
// Fix JSX fragments and remove placeholder {}/[] code.


  const getTrips = async () => {
    setError(undefined);
    try {
      const response = await TripService.getAllTrips();
      if (!response.ok) {
        setError(response.statusText);
        return;
      }
      const data = await response.json();
      setTrips(data);
    } catch (error: any) {
      setError(error.message);
    }
  };

  // It calls the getTrips() function once, when the component mounts
  useEffect(() => {
    getTrips();
  }, []);

  return (
    <>
      <Head>
        <title>Holidays</title>
      </Head>
      <Header />
      <main className="p-6 min-h-screen flex flex-col items-center">
        <h1>Holiday Trips</h1>
        {error && <div className="text-red-800">{error}</div>}
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-4">
            Available Holidays ({trips.length})
          </h2>
          <div className="grid gap-4">
            {trips.map((trip) => (
              <div key={trip.id} className="p-4 border rounded-lg">
                <h3 className="font-bold text-lg">🏖️ {trip.destination}</h3>
                <p className="text-gray-600 mb-2">{trip.description}</p>
                <p className="text-sm">
                  📅 {new Date(trip.startDate).toLocaleDateString()} -{" "}
                  {new Date(trip.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm">
                  👤 Organiser: {trip.organiser?.firstName}{" "}
                  {trip.organiser?.lastName}
                </p>
                <p className="text-sm mb-3">
                  👥 Attendees: {trip.attendees?.length || 0} people
                </p>
                <Link
                  href={`/trips/${trip.id}`}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg text-sm px-4 py-2"
                >
                  More Info
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
};

export const getServerSideProps = async (context: { locale: any }) => {
  const { locale } = context;

  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
  };
};

export default Trips;
