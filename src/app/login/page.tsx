import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import logo from "../../../public/logo.svg"
import LoginFormEvent from "@/components/forms/auth-event/form";

export const metadata: Metadata = {
  title: "Login",
  description: "",
};

export default function AuthenticationPage() {
  return (
    <div className="relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-black" />
        <div className="relative z-20 flex items-center text-lg font-medium gap-x-4">
          
        <Link
            href={"/"}
          >
             Castellano ph.
          </Link>
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">

          </blockquote>
        </div>
      </div>
      <div className="p-4  h-full flex items-center ">
        <div className="mx-auto h-full flex w-full flex-col justify-center space-y-6 sm:w-[350px] ">
            <LoginFormEvent/>
         
        </div>
      </div>
    </div>
  );
}
