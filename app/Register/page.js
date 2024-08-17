'use client'
import { useState } from 'react';
import Header from '../components/Header'
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import axios from 'axios'; // Import axios

export default function Register() {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorColor, setErrorColor] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Store the password in session storage
            sessionStorage.setItem('password', password);

            // Generate verification code and send email
            const response = await axios.post('/api/sendVerificationCode', { email, firstname, lastname, password });
            if (response.status === 200) {
                // Navigate to verification page
                window.location.href = `/Verify?email=${email}`;
            } else {
                setError('Failed to send verification email. Please try again.');
                setErrorColor('text-red-500');
            }
        } catch (err) {
            setError('Error creating account');
            setErrorColor('text-red-500');
        }
    };

    return (
      <>
        <Header />
        <div className="relative isolate px-6 pt-14 lg:px-8 bg-[#140D0C] flex min-h-screen flex-1 flex-col justify-center py-12 lg:px-8 overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          >
            <div
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#5A3A2F] to-[#2B1D1A] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            />
          </div>
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <img
              alt=""
              src="" /* TODO: Add Logo */
              className="mx-auto h-10 w-auto"
            />
          </div>
          <div 
          style={{
            width: '500px', 
            height: '564px',
            margin: '0px auto 0 auto', 
            padding: '20px', 
            borderRadius: '10px',
            boxShadow: '0px 0px 10px 5px rgba(20,13,1,1)', 
            WebkitBoxShadow: '0px 0px 10px 5px rgba(20,13,1,1)', 
            MozBoxShadow: '0px 0px 10px 5px rgba(20,13,1,1)',
            border: '2px solid white'
          }}>
            {error && <p className={`${errorColor} text-right mt-0 pt-0`}>{error}</p>}
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-white" style={{paddingTop: '0', textShadow: '2px 2px 4px rgba(0, 0, 0, 1)'}}>
              Create Account
            </h2>
            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm" 
              style={{
                position: 'fixed', 
                transform: `translate(10%, ${error ? '-12%' : '0%'})`
              }}>
              <form onSubmit={handleSubmit} className="space-y-6">

                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium leading-6 text-gray-300">
                    First Name
                  </label>
                  <div className="mt-2">
                    <input
                      id="firstname"
                      name="firstname"
                      type="text"
                      required
                      autoComplete="firstname"
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#b79994] sm:text-sm sm:leading-6"
                      style={{ fontSize: '1rem', fontWeight: 'bold', paddingLeft: '10px' }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium leading-6 text-gray-300">
                    Last Name
                  </label>
                  <div className="mt-2">
                    <input
                      id="lastname"
                      name="lastname"
                      type="text"
                      required
                      autoComplete="lastname"
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#b79994] sm:text-sm sm:leading-6"
                      style={{ fontSize: '1rem', fontWeight: 'bold', paddingLeft: '10px' }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-300">
                    Email address
                  </label>
                  <div className="mt-2">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#b79994] sm:text-sm sm:leading-6"
                      style={{ fontSize: '1rem', fontWeight: 'bold', paddingLeft: '10px' }}
                    />
                  </div>
                </div>
  
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-300">
                      Password
                    </label>
                  </div>
                  <div className="mt-2">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#b79994] sm:text-sm sm:leading-6"
                      style={{ fontSize: '1rem', fontWeight: 'bold', paddingLeft: '10px' }}
                    />
                  </div>
                </div>
  
                <div className=""
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '15px',
                }}
                >
                  <button
                    type="submit"
                    className="flex w-[205px] justify-center rounded-md bg-[#683F24] px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-[#442718] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b79994]"
                    style={{ transition: 'background-color 0.3s ease-in-out' }}
                  >
                    Create Account
                  </button>

                  <a href="/Login"
                    className="flex w-full justify-center rounded-md bg-[#683F24] px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-[#442718] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b79994]"
                    style={{
                      transition: 'background-color 0.3s ease-in-out',
                    }}
                  >
                    Have an account? Login here
                  </a>
                </div>
              </form>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          >
            <div
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
              className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#5A3A2F] to-[#2B1D1A] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            />
          </div>
        </div>
      </>
    )
  }