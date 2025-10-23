export type Holiday = {
  id?: number;
  destination: string;
  startDate: Date;
  endDate: Date;
  description: string;
  organiser: User;
  attendees: User[];
};

export type Experience = {
  id?: number;
  name: string;
  description: string;
  date: Date;
  location: string;
  organiser: User;
  attendees: User[];
};

export type User = {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isOrganiser: boolean;
};

export type StatusMessage = {
  message: string;
  type: "error" | "success";
};

export type LoggedInUser = {
  id: number;
  token: string;
  firstName: string;
  lastName: string;
  role: "ORGANISER" | "CLIENT";
};
