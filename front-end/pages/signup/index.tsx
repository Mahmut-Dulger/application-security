import React from "react";
import UserSignupForm from "@components/users/UserSignupForm";

const SignupPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <UserSignupForm />
    </div>
  );
};

export default SignupPage;
