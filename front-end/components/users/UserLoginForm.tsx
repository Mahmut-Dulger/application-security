import classNames from "classnames";
import { useRouter } from "next/router";
import React, { useState } from "react";
import UserService from "@services/UserService";
import { StatusMessage } from "@types";
import { useTranslation } from "next-i18next";

const UserLoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const router = useRouter();
  const { t } = useTranslation();
  const validateEmail = (emailValue: string) => {
    if (!emailValue || emailValue.trim() === "") {
      setEmailError(t("login.validate.emailRequired"));
    } else {
      setEmailError(null);
    }
  };

  const validatePassword = (passwordValue: string) => {
    if (!passwordValue || passwordValue.trim() === "") {
      setPasswordError(t("login.validate.password"));
    } else {
      setPasswordError(null);
    }
  };

  const clearErrors = () => {
    setEmailError(null);
    setPasswordError(null);
    setStatusMessages([]);
  };
  const validate = (): boolean => {
    let result = true;

    // Clear previous errors first
    setEmailError(null);
    setPasswordError(null);

    if (!email || email.trim() === "") {
      setEmailError(t("login.validate.emailRequired"));
      result = false;
    }

    if (!password || password.trim() === "") {
      setPasswordError(t("login.validate.password"));
      result = false;
    }

    return result;
  };
  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();

    // Only clear status messages, not field validation errors
    setStatusMessages([]);

    if (!validate()) {
      return;
    }
    const credentials = { email, password };
    const response = await UserService.loginUser(credentials);

    if (response.status === 200) {
      setStatusMessages([{ message: t("login.success"), type: "success" }]);
      const user = await response.json();
      sessionStorage.setItem(
        "loggedInUser",
        JSON.stringify({
          id: user.id,
          token: user.token,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        })
      );
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } else if (response.status === 401) {
      const { errorMessage } = await response.json();
      setStatusMessages([{ message: errorMessage, type: "error" }]);
    } else {
      setStatusMessages([
        {
          message: t("general.error"),
          type: "error",
        },
      ]);
    }
  };

  return (
    <div className="max-w-sm m-auto">
      <div>
        <h3 className="px-0">{t("login.title")}</h3>
      </div>
      {statusMessages && (
        <div className="row">
          <ul className="list-none mb-3 mx-auto ">
            {statusMessages.map(({ message, type }, index) => (
              <li
                key={index}
                className={classNames({
                  " text-red-800": type === "error",
                  "text-green-800": type === "success",
                })}
              >
                {message}
              </li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {" "}
        <div>
          <div>
            <label
              htmlFor="emailInput"
              className="block mb-2 text-sm font-medium"
            >
              {t("login.label.email")}
            </label>
          </div>
          <div className="block mb-2 text-sm font-medium">
            {" "}
            <input
              id="emailInput"
              type="email"
              value={email}
              onChange={(event) => {
                const newEmail = event.target.value;
                setEmail(newEmail);
                validateEmail(newEmail);
              }}
              className="border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue:500 block w-full p-2.5"
            />
            {emailError && <div className="text-red-800 ">{emailError}</div>}
          </div>
        </div>
        <div className="mt-2">
          <div>
            <label
              htmlFor="passwordInput"
              className="block mb-2 text-sm font-medium"
            >
              {t("login.label.password")}
            </label>
          </div>
          <div className="block mb-2 text-sm font-medium">
            {" "}
            <input
              id="passwordInput"
              type="password"
              value={password}
              onChange={(event) => {
                const newPassword = event.target.value;
                setPassword(newPassword);
                validatePassword(newPassword);
              }}
              className="border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue:500 block w-full p-2.5"
            />
            {passwordError && (
              <div className=" text-red-800">{passwordError}</div>
            )}
          </div>
        </div>
        <div className="row">
          <button
            className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
            type="submit"
          >
            {t("login.button")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserLoginForm;
