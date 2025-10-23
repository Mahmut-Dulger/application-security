const getAllTrips = () => {
  return fetch(process.env.NEXT_PUBLIC_API_URL + "/trips", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const getTripById = (tripId: string) => {
  return fetch(process.env.NEXT_PUBLIC_API_URL + `/trips/${tripId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const TripService = {
  getAllTrips,
  getTripById,
};

export default TripService;
