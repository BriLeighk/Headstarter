'use client'
import React, { useState, useEffect } from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { BellIcon, Bars3Icon, XMarkIcon, PencilSquareIcon, ArrowUpOnSquareIcon, CloudUploadIcon, TrashIcon, TrophyIcon } from '@heroicons/react/24/outline'
import { doc, getDoc, updateDoc, query, collection, where, getDocs, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { auth, db, storage } from '../firebase'; // Ensure this import is correct
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import axios from 'axios';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import './customQuill.css';
import OtherUsers from '../components/OtherUsers';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Dashboard() {
  const [user, setUser] = useState({
    firstname: '',
    lastname: '',
    email: '',
    imageUrl: '/placeholder.png',
    bio: '',
    password: '*'.repeat(8) // Fixed-length masked password
  });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isPasswordEditing, setIsPasswordEditing] = useState(false); // Corrected state initialization
  const [activeTab, setActiveTab] = useState('profile'); // New state for active tab
  const [showProfileConfirmation, setShowProfileConfirmation] = useState(false); // State for profile confirmation
  const [showNameConfirmation, setShowNameConfirmation] = useState(false); // State for name confirmation in settings
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false); // State for password confirmation
  const [showError, setShowError] = useState(false); // State for error messages
  const [errorMessage, setErrorMessage] = useState(''); // State for error message text
  const [isSubscribed, setIsSubscribed] = useState(false); // State for subscription status
  const [showSuccess, setShowSuccess] = useState(false); // State for success message
  const [projects, setProjects] = useState([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false); // New state for modal visibility
  const [isClient, setIsClient] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [hoveredUser, setHoveredUser] = useState(null); // New state to track which user's badge is hovered

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddProject = () => {
    setProjects([...projects, { title: projectTitle, description: projectDescription }]);
    setProjectTitle('');
    setProjectDescription('');
  };

  const handleDeleteProject = (index) => {
    const updatedProjects = projects.filter((_, i) => i !== index);
    setProjects(updatedProjects);
  };

  const handleGithubUrlChange = (event) => {
    setGithubUrl(event.target.value);
  };
  
  const handleLinkedinUrlChange = (event) => {
    setLinkedinUrl(event.target.value);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const authUser = auth.currentUser;
        if (!authUser) {
          throw new Error('User not authenticated');
        }

        const userQuery = query(collection(db, 'users'), where('email', '==', authUser.email));
        const querySnapshot = await getDocs(userQuery);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          const highResPhotoURL = userData.imageUrl ? userData.imageUrl.replace('s96-c', 's400-c') : '/placeholder.png';
          setUser({
            ...userData,
            email: authUser.email,
            uid: userDoc.id,
            imageUrl: highResPhotoURL,
          });
          setFirstName(userData.firstname || '');
          setLastName(userData.lastname || '');
          setBio(userData.bio || '');
          setProjects(userData.projects || []);
          setGithubUrl(userData.githubUrl || ''); // Set GitHub URL
          setLinkedinUrl(userData.linkedinUrl || ''); // Set LinkedIn URL
  
          // Fetch subscription status from Brevo
          const response = await axios.post('/api/checkBrevoSubscription', { email: userData.email });
          setIsSubscribed(response.data.isSubscribed);
        } else {
          throw new Error('User data not found in Firestore');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
  
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData();
      } else {
        setUser(null);
      }
    });
  
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      window.location.href = '/Login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file && user) {
      const storageRef = ref(storage, `profileImages/${user.uid}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), { imageUrl });
      setUser((prevUser) => ({ ...prevUser, imageUrl }));
    }
  };

  const handleFirstNameChange = (event) => {
    setFirstName(event.target.value);
  };

  const handleLastNameChange = (event) => {
    setLastName(event.target.value);
  };

  const handleBioChange = (value) => {
    setBio(value);
  };

  const handleSave = async () => {
    if (user && user.email) { // Ensure user and user.email are defined

      // Ensure GitHub and LinkedIn URLs are valid and have the correct prefix
      const formattedGithubUrl = githubUrl && !githubUrl.startsWith('https://') ? `https://${githubUrl}` : githubUrl;
      const formattedLinkedinUrl = linkedinUrl && !linkedinUrl.startsWith('https://') ? `https://${linkedinUrl}` : linkedinUrl;

      if (!isValidUrl(formattedGithubUrl, 'github') & !isValidUrl(formattedLinkedinUrl, 'linkedin') * githubUrl !== '' & linkedinUrl !== '') {
        setErrorMessage('Please enter valid URLs for GitHub and LinkedIn.');
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
        return;
      } else if (!isValidUrl(formattedGithubUrl, 'github') && githubUrl !== '') {
        setErrorMessage('Please enter a valid URL for GitHub.');
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
        return;
      } else if (!isValidUrl(formattedLinkedinUrl, 'linkedin') && linkedinUrl !== '') {
        setErrorMessage('Please enter a valid URL for LinkedIn.');
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
        return;
      }

      try {
        const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(userQuery);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          await updateDoc(userDoc.ref, { firstname: firstName, lastname: lastName, bio, projects, githubUrl: formattedGithubUrl, linkedinUrl: formattedLinkedinUrl });
          setUser((prevUser) => ({ ...prevUser, firstname: firstName, lastname: lastName, bio, projects, githubUrl: formattedGithubUrl, linkedinUrl: formattedLinkedinUrl }));
          setIsEditing(false);

          // Show profile confirmation message
          setShowProfileConfirmation(true);
          setTimeout(() => setShowProfileConfirmation(false), 3000);

          // Call the API route to update Brevo contact information
          const response = await fetch('/api/updateBrevoContact', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              firstName,
              lastName,
            }),
          });

          if (response.ok) {
            console.log('Brevo contact updated successfully.');
          } else {
            const errorData = await response.json();
            console.error('Error updating Brevo contact:', errorData);
            throw new Error(errorData.message || 'Error updating Brevo contact');
          }
        } else {
          throw new Error('User data not found in Firestore');
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        setErrorMessage('Error updating profile: ' + error.message);
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
      }
    } else {
      console.error('User or user email is not defined');
      setErrorMessage('User or user email is not defined');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const handleSaveName = async () => {
    if (user && user.email) {
      try {
        const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(userQuery);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          await updateDoc(userDoc.ref, { firstname: firstName, lastname: lastName });
          setUser((prevUser) => ({ ...prevUser, firstname: firstName, lastname: lastName }));
          setIsEditing(false);

          // Show name confirmation message
          setShowNameConfirmation(true);
          setTimeout(() => setShowNameConfirmation(false), 3000);
        } else {
          throw new Error('User data not found in Firestore');
        }
      } catch (error) {
        console.error('Error updating name:', error);
        setErrorMessage('Error updating name ');
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
      }
    } else {
      console.error('User or user email is not defined');
      setErrorMessage('User or user email is not defined');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New passwords do not match. Please try again');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }
  
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
  
      // Check if the user has a password credential stored
      const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
      const querySnapshot = await getDocs(userQuery);
      if (querySnapshot.empty) {
        throw new Error('User data not found in Firestore');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (user.providerData.some(provider => provider.providerId === 'google.com') && !user.providerData.some(provider => provider.providerId === 'password')) {
        setErrorMessage('Please send your reset request to Google.');
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
        return;
      }
  
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
  
      // Update the password in Firestore
      await updateDoc(userDoc.ref, { password: newPassword });
  
      // Show password confirmation message
      setShowPasswordConfirmation(true);
      setTimeout(() => setShowPasswordConfirmation(false), 3000);
      setIsPasswordEditing(false);
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        setErrorMessage('Current password is incorrect. Please try again');
      } else if (error.code === 'auth/invalid-credential') {
        setErrorMessage('Invalid credentials. Please try again');
      } else {
        setErrorMessage('Error resetting password. Please try again later');
      }
      console.error('Error resetting password:', error); // Log the exact error
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const handleRemovePhoto = async () => {
    if (user) {
      const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
      const querySnapshot = await getDocs(userQuery);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(userDoc.ref, { imageUrl: '/placeholder.png' });
        setUser((prevUser) => ({ ...prevUser, imageUrl: '/placeholder.png' }));
      } else {
        console.error('User data not found in Firestore');
        setErrorMessage('User data not found in Firestore');
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
      }
    }
  };

  const handleUploadButtonClick = () => {
    if (typeof document !== 'undefined') {
      document.getElementById('file-upload').click();
    }
  };
  
  const navigation = [
    
      // add more tabs here
  ]

  const userNavigation = [
    { name: 'Profile', href: '#', onClick: () => setActiveTab('profile') },
    { name: 'Settings', href: '#', onClick: () => setActiveTab('settings') },
    { name: 'Sign out', href: '#', onClick: handleSignOut },
  ]

  const initialUser = user ? {
    name: user.firstname + ' ' + user.lastname,
    email: user.email,
    imageUrl: user.imageUrl
  } : { name: '', email: '', imageUrl: '/placeholder.png' };

  const handleSubscriptionChange = () => {
    setIsSubscribed(!isSubscribed);
  };

  const handleSaveSubscription = async () => {
    try {
      const response = await axios.post('/api/updateBrevoSubscription', {
        email: user.email,
        isSubscribed,
      });
      if (response.status === 200) {
        console.log('Subscription updated successfully.');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000); // Hide success message after 3 seconds
      } else {
        throw new Error(response.data.message || 'Error updating subscription');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      setErrorMessage('Error updating subscription ');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  // Function to get the ordinal suffix for a number
  const getOrdinalSuffix = (number) => {
    const j = number % 10,
          k = number % 100;
    if (j === 1 && k !== 11) {
      return number + "st";
    }
    if (j === 2 && k !== 12) {
      return number + "nd";
    }
    if (j === 3 && k !== 13) {
      return number + "rd";
    }
    return number + "th";
  };


  // states to track dragging movement of users cursor
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [draggingStyle, setDraggingStyle] = useState({});
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); //ensure project remains relative to cursor 


  const handleDragStart = (index) => (event) => {
    const rect = event.target.getBoundingClientRect();
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setDraggingIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.target);
    event.dataTransfer.setDragImage(new Image(), 0, 0); // Hide the default drag image
  };

  const handleDrag = (event) => {
    if (draggingIndex !== null) {
      setDraggingStyle({
        position: 'fixed', // Changed to absolute for correct positioning
        top: event.clientY - dragOffset.y, // Adjusted to align cursor tip with origin
        left: event.clientX - dragOffset.x, // Adjusted to align cursor tip with origin
        pointerEvents: 'none',
        zIndex: 1000,
      });
    }
  };

  const handleDrop = (index) => (event) => {
    event.preventDefault();
    const draggedIndex = draggingIndex;
    if (draggedIndex !== index) {
      const updatedProjects = [...projects];
      const [draggedProject] = updatedProjects.splice(draggedIndex, 1);
      updatedProjects.splice(index, 0, draggedProject);
      setProjects(updatedProjects);
    }
    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDraggingStyle({});
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  useEffect(() => {
    if (draggingIndex !== null) {
      document.addEventListener('dragover', handleDrag);
      document.addEventListener('dragend', handleDragEnd);
    } else {
      document.removeEventListener('dragover', handleDrag);
      document.removeEventListener('dragend', handleDragEnd);
    }
    return () => {
      document.removeEventListener('dragover', handleDrag);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, [draggingIndex]);


  // Check if GitHub and LinkedIn are valid URLs
  const isValidUrl = (url, type) => {
    try {
      const parsedUrl = new URL(url);
      if (type === 'github') {
        return parsedUrl.hostname === 'github.com' && parsedUrl.pathname.split('/').length === 2;
      } else if (type === 'linkedin') {
        return parsedUrl.hostname === 'www.linkedin.com' && parsedUrl.pathname.startsWith('/in/');
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  
  

  return (
    <>
      <div className="relative isolate bg-[#140D0C] min-h-[800px] overflow-hidden" style={{margin: '0',padding: '0'}}>
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
        <Disclosure as="nav" className="bg-[#140D0C]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-20 items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                    <a href="/">
                    <img
                    alt="The Tech Catalyst"
                    src="/logo.png"
                    className="h-20 w-20"
                  />
                    </a>
                  
                </div>
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-4">
                    {navigation.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        aria-current={item.current ? 'page' : undefined}
                        className={classNames(
                          item.current ? 'bg-[#1E1412] text-white' : 'text-gray-300 hover:bg-[#140D0C] hover:text-white',
                          'rounded-md px-3 py-2 text-sm font-medium',
                        )}
                      >
                        {item.name}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="ml-4 flex items-center md:ml-6">
                  <button
                    type="button"
                    className="relative rounded-full bg-[#140D0C] p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#C69635] focus:ring-offset-2 focus:ring-offset-gray-800"
                  >
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">View notifications</span>
                    <BellIcon aria-hidden="true" className="h-6 w-6" />
                  </button>

                  {/* Profile dropdown */}
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <MenuButton className="relative flex max-w-xs items-center rounded-full bg-[#140D0C] text-sm focus:outline-none focus:ring-2 focus:ring-[#C69635] focus:ring-offset-2 focus:ring-offset-gray-800">
                        <span className="absolute -inset-1.5" />
                        <span className="sr-only">Open user menu</span>
                        <img alt="" src={initialUser.imageUrl} className="h-10 w-10 rounded-full object-cover" />
                      </MenuButton>
                    </div>
                    <MenuItems
                      transition
                      className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md py-1 shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                      style={{ backgroundColor: '#FFFFFF' }} // Reverted to original background color
                    >
                      {userNavigation.map((item) => (
                        <MenuItem key={item.name}>
                          {({ active }) => (
                            <a
                              href={item.href}
                              className={`block px-4 py-2 text-sm text-gray-700 ${active ? 'bg-[#D3D3D1]' : ''}`}
                              onClick={item.onClick}
                              style={{ transition: 'background-color 0.3s ease-in-out' }} // Added transition
                            >
                              {item.name}
                            </a>
                          )}
                        </MenuItem>
                      ))}
                    </MenuItems>
                  </Menu>
                </div>
              </div>
              <div className="-mr-2 flex md:hidden">
                {/* Mobile menu button */}
                <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md bg-[#140D0C] p-2 text-[#F2F4E6] hover:bg-[#1E1412] hover:text-[#F2F4E6] focus:outline-none focus:ring-2 focus:ring-[#C69635] focus:ring-offset-2 focus:ring-offset-gray-800"
                style={{
                  transition: 'background-color 0.3s ease-in-out',
                }}
                >
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  <Bars3Icon aria-hidden="true" className="block h-6 w-6 group-data-[open]:hidden" />
                  <XMarkIcon aria-hidden="true" className="hidden h-6 w-6 group-data-[open]:block" />
                </DisclosureButton>
              </div>
            </div>
          </div>

          <DisclosurePanel className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
              {navigation.map((item) => (
                <DisclosureButton
                  key={item.name}
                  as="a"
                  href={item.href}
                  aria-current={item.current ? 'page' : undefined}
                  className={classNames(
                    item.current ? 'bg-[#140D0C] text-white' : 'text-gray-300 hover:bg-[#1E1412] hover:text-white',
                    'block rounded-md px-3 py-2 text-base font-medium',
                  )}
                  onClick={item.onClick}
                >
                  {item.name}
                </DisclosureButton>
              ))}
            </div>
            <div className="border-t border-gray-700 pb-3 pt-4">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <img alt="" src={initialUser.imageUrl} className="h-10 w-10 rounded-full object-cover" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium leading-none text-white">{initialUser.name}</div>
                  <div className="text-sm font-medium leading-none text-gray-400">{initialUser.email}</div>
                </div>
                <button
                  type="button"
                  className="relative ml-auto flex-shrink-0 rounded-full bg-[#140D0C] p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#C69635] focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">View notifications</span>
                  <BellIcon aria-hidden="true" className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-3 space-y-1 px-2">
                {userNavigation.map((item) => (
                  <DisclosureButton
                    key={item.name}
                    as="a"
                    href={item.href}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-[#1E1412] hover:text-white"
                    onClick={item.onClick}
                    style={{
                      transition: 'background-color 0.2s ease-in-out',
                    }}
                  >
                    {item.name}
                  </DisclosureButton>
                ))}
              </div>
            </div>
          </DisclosurePanel>
        </Disclosure>

          

        

        <main>
        <div className={`flex ${activeTab === 'profile' ? 'flex-col md:flex-row' : 'flex justify-center'}`}>

        {activeTab === 'profile' && (
            <div className="w-full md:w-1/4 md:position-fixed justify-start order-last md:order-first">
              <OtherUsers currentUserEmail={user?.email} />

            </div>

          )}

            <div className="">
              
            <div className="b mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 mt-14">
            
            
            {user && (
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                <img 
                    alt="" 
                    src={user.imageUrl} 
                    className="h-32 w-32 rounded-full shadow-lg object-cover" 
                    style={{ border: `1px solid ${user.userNumber && user.userNumber <= 100 ? '#C69635' : '#2D1E1B'}` }}
                  />
                  {user.userNumber && user.userNumber <= 100 && (
                    <img
                      alt="First User Badge"
                      src="./firstUserBadge.png"
                      className="absolute -top-[32px] right-[34px] h-14 w-14 cursor-pointer"
                      onMouseEnter={() => {
                        setIsBadgeModalOpen(true);
                        setHoveredUser(user);
                      }}
                      onMouseLeave={() => setIsBadgeModalOpen(false)}
                    />
                  )}
                  {isBadgeModalOpen && hoveredUser === user && (
                    <div
                    className="absolute top-8 right-full mr-1 sm:mr-4 transform -translate-y-1/2 bg-[#1E1412] p-0.5 rounded-lg shadow-lg shadow-black text-center w-[100px] border-[#C69635] border-[1px] md:w-[150px] md:p-2"
                    onMouseEnter={() => setIsBadgeModalOpen(true)}
                    onMouseLeave={() => {
                        setIsBadgeModalOpen(false);
                    }}
                    >
                    <div className="absolute right-[-16px] top-1/3 transform -translate-y-1/2 w-0 h-0 border-8 border-transparent border-l-[#C69635] after:content-[''] after:absolute after:top-1/2 after:left-[-8px] after:transform after:-translate-y-1/2 after:border-8 after:border-transparent after:border-l-[#1E1412] after:ml-[-1px] md:right-[-16px] md:border-8">
                    </div>
                    <img src="/firstUserBadge.png" alt="First User Badge" className="h-8 w-8 mx-auto mb-0.5 md:h-12 md:w-12"/>
                    <h2 className="text-[#DDBA6C] text-[10px] font-bold mb-0.5 md:text-sm">First User Badge</h2>
                    <p className="text-[#DDBA6C] text-[8px] md:text-xs">{hoveredUser && `Earned as The Tech Catalysts' ${getOrdinalSuffix(hoveredUser.userNumber)} member.`}</p>
                    <p className="text-[#C69635] text-[8px] flex row text-left mt-0.5 md:text-xs">
                      <TrophyIcon className="h-2 w-2 mr-0.5 md:h-3 md:w-3"/>Must be one of The Tech Catalysts' first 100 registered users to earn this badge.</p>
                    </div>
                    )}
                  <Menu as="div" className="absolute bottom-0 right-0">
                    <MenuButton className="cursor-pointer">
                      <ArrowUpOnSquareIcon className="h-6 w-6 text-white" />
                    </MenuButton>
                    <MenuItems className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={handleUploadButtonClick}
                            className={`block w-full text-left px-4 py-2 text-sm text-gray-700 ${active ? 'bg-gray-100' : ''}`}
                          >
                            Upload a photo
                          </button>
                        )}
                      </MenuItem>
                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={handleRemovePhoto}
                            className={`block w-full text-left px-4 py-2 text-sm text-gray-700 ${active ? 'bg-gray-100' : ''}`}
                          >
                            Delete photo
                          </button>
                        )}
                      </MenuItem>
                    </MenuItems>
                  </Menu>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  
                  


                </div>
                

                <div className="bg-[#1E1412] p-4 rounded-lg shadow-lg w-full max-w-[700px] relative" style={{ border: '2px solid #2D1E1B' }}>
                  
                  
                  <div className=" text-[#C69635] text-sm font-bold px-2 py-1 mb-2 pl-0">
                  {/* Github and LinkedIn */}

                  <div className="flex flex-row gap-10">

                    {isEditing && (
                      <>
                      <div className="flex flex-row gap-2">

                        <div className="flex flex-col">
                          <div className="text-[#C69635] text-xl font-bold mb-2">GitHub</div>
                            <input
                              type="text"
                              value={githubUrl}
                              onChange={handleGithubUrlChange}
                              className="bg-[#231715] ml-0 h-[23.2px] border border-gray-400 rounded text-left text-sm text-white pl-1 border-[#33211E] border-[2px] focus:border-[#C69635] focus:outline-none mb-4"
                              style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                            />
                        </div>
                        <div className="flex flex-col">
                            <div className="text-[#C69635] text-xl font-bold mb-2">LinkedIn</div>
                              <input
                                type="text"
                                value={linkedinUrl}
                                onChange={handleLinkedinUrlChange}
                                className="bg-[#231715] ml-0 h-[23.2px] border border-gray-400 rounded text-left text-sm text-white pl-1 border-[#33211E] border-[2px] focus:border-[#C69635] focus:outline-none mb-4"
                                style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                              />
                        </div>

                      </div>
                      </>
                    )}
                  
                    {/* Github and LinkedIn */}
                    <div className={`flex justify-left space-x-4 mt-2 mb-2 ${isEditing ? 'pt-[27px]' : ''}`} >
                    {githubUrl && (
                        <a href={githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`} target="_blank" rel="noopener noreferrer">
                          <svg className="h-6 w-6 text-[#C69635]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.165c-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.775.42-1.305.763-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.467-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23.957-.266 1.98-.398 3-.403 1.02.005 2.043.137 3 .403 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.24 2.873.118 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.803 5.625-5.475 5.92.43.37.823 1.102.823 2.222v3.293c0 .32.218.694.825.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                          </svg>
                        </a>
                      )}
                      {linkedinUrl && (
                        <a href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`} target="_blank" rel="noopener noreferrer">
                          <svg className="h-6 w-6 text-[#C69635]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.5c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.5h-3v-5.5c0-1.38-1.12-2.5-2.5-2.5s-2.5 1.12-2.5 2.5v5.5h-3v-10h3v1.5c.88-1.32 2.34-2.5 4-2.5 2.76 0 5 2.24 5 5v6.5z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>

                  
                </div>
                  {activeTab === 'profile' && (
                    <>
                      <button onClick={() => setIsEditing(true)} className="absolute top-2 right-2">
                        <PencilSquareIcon className="h-6 w-6 text-white hover:text-[#C69635]" />
                      </button>
                      {isEditing && <div className="text-[#C69635] text-[22px] text-left font-bold mb-2">Name</div>}


                      <div className={` text-[#C69635] text-[22px] flex items-center mb-2 ${!isEditing ? 'font-bold justify-center' : ''}`}>
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={firstName}
                              onChange={handleFirstNameChange}
                              size={firstName.length || 1}
                              className="bg-[#231715] border border-gray-400 rounded text-left text-sm mr-2 text-white pl-1 border-[#33211E] border-[2px] focus:border-[#C69635] focus:outline-none" 
                              style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                            />
                            <input
                              type="text"
                              value={lastName}
                              onChange={handleLastNameChange}
                              size={lastName.length || 1}
                              className="bg-[#231715] border border-gray-400 rounded text-left text-sm text-white pl-1 border-[#33211E] border-[2px] focus:border-[#C69635] focus:outline-none" 
                              style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                            />
                          </>
                        ) : (
                          <span>{user.firstname} {user.lastname}</span>
                        )}
                      </div>
                      

                      {!isEditing && (
                        <div className="text-[#C69635] text-sm font-bold px-2 py-1 mb-0 text-center">
                          {user.email === 'kirchgessner@wisc.edu' ? 'Founder' : user.email === 'tridhatriv@gmail.com' || user.email === 'bethelbezabeh@gmail.com' ? 'Co-Founder' : ''}
                        </div>
                      )}
                      {isEditing && <div className="text-[#C69635] text-xl font-bold mb-2 pt-8 mt-0">Bio</div>}
                      <div className={`text-white text-sm flex items-center text-center mb-4 mt-2`}>
                        {isEditing ? (
                          <ReactQuill
                            value={bio}
                            onChange={(value) => {
                              handleBioChange(value);
                            }}
                            className="custom-quill text-left text-sm text-white w-full pl-1"
                            style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                            maxLength={user.email === 'kirchgessner@wisc.edu' ? undefined : 400}
                          />
                          
                        ) : (
                          <div className="display-container" dangerouslySetInnerHTML={{ __html: user.bio }} />
                        )}
                      </div>
                      {!isEditing ? (
                        <>
                        {user.email === 'kirchgessner@wisc.edu' && (
                          <>
                            <div className="bg-[#C69635] text-[#1E1412] text-xs font-bold px-2 py-1 rounded-full w-[120px] text-center justify-center mx-auto">Lead Developer</div>
                          </>
                        )}
                        {user.email === 'tridhatriv@gmail.com' || user.email === 'bethelbezabeh@gmail.com' && (
                          <>
                            <div className="bg-[#C69635] text-[#1E1412] text-xs font-bold px-2 py-1 rounded-full w-[120px] text-center justify-center mx-auto">Developer</div>
                          </>
                        )}
                        </>
                      ) : (
                        <>
                        </>
                      )}
                      


                      <div className="text-[#C69635] text-[22px] font-bold mb-0 mt-8">
                        {isEditing ? 'Add Project' : 'Projects'}
                      </div>
                      {isEditing && (
                        <>
                          <p className="text-gray-400 text-xs mb-4">Add your projects below, by filling out the form with a title and description, to showcase your work to others in the community. This will also help us match you with other tech enthusiasts who share similar or complementary skills.</p>
                          <div className="mb-4">
                            <label className="text-white text-sm">Project Title</label>
                            <input
                              type="text"
                              value={projectTitle}
                              onChange={(e) => setProjectTitle(e.target.value)}
                              className="bg-[#1E1412] border border-gray-400 rounded text-left text-[#C99F4A] w-full pl-1 mb-2 text-sm border-[#33211E] font-bold border-[2px] focus:border-[#C69635] focus:outline-none"
                              style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                            />
                            <label className="text-white text-sm">Project Description</label>
                            <ReactQuill
                              value={projectDescription}
                              onChange={(value) => {
                              setProjectDescription(value);
                              
                            }}
                            className="custom-quill text-left text-sm w-full pl-1"
                            style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                            maxLength={user.email === 'kirchgessner@wisc.edu' ? undefined : 1000}
                          />
                            <div className="flex justify-start mt-2 mb-8">
                              <button 
                                onClick={handleAddProject} 
                                className="text-white text-sm px-3 py-1 border border-white hover:border-[#C69635] rounded mt-2 mb-8" 
                              >
                                Add Project
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                      {isEditing && (
                        <div className="text-[#C69635] text-[22px] font-bold mb-4 mt-8">Your Projects</div>
                      )}
                      
                      {projects.map((project, index) => (
                        <div
                          key={index}
                          className="mb-6 flex justify-evenly items-center"
                          draggable={isEditing}
                          onDragStart={handleDragStart(index)}
                          onDrop={handleDrop(index)}
                          onDragOver={handleDragOver}
                          style={draggingIndex === index ? draggingStyle : {}}
                        >
                          {isEditing && (
                            
                            <div className="cursor-move mr-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 10h16M4 14h16"
                                />
                              </svg>
                            </div>
                          )}
                          
                          <div className="flex items-start w-[80%]">
                            <div>
                              {isEditing ? (
                                <>
                                  <input
                                    type="text"
                                    value={project.title}
                                    onChange={(e) => {
                                      const updatedProjects = [...projects];
                                      updatedProjects[index].title = e.target.value;
                                      setProjects(updatedProjects);
                                    }}
                                    className="bg-[#1E1412] border border-gray-400 rounded text-left w-[72vw] max-w-[580px] text-[#C99F4A] font-bold pl-1 mb-2 text-sm border-[#33211E] border-[2px] focus:border-[#C69635] focus:outline-none"
                                    style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }} // Added width: 100%
                                  />
                                  <ReactQuill
                                    value={project.description}
                                    onChange={(value) => {
                                      const updatedProjects = [...projects];
                                      updatedProjects[index].description = value;
                                      setProjects(updatedProjects);
                                    }}
                                    className="custom-quill bg-[#231715] text-left text-sm w-[72vw] max-w-[580px] pl-1"
                                    style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                                    maxLength={user.email === 'kirchgessner@wisc.edu' ? undefined : 1000}
                                  />
                                </>
                              ) : (
                                <>
                                  <div className="text-[#C99F4A] text-[16px] font-bold">{project.title}</div>
                                  <div className="display-container text-white text-sm" dangerouslySetInnerHTML={{ __html: project.description.replace(/<ul>/g, '<ul class="list-disc list-inside ml-4">').replace(/<ol>/g, '<ol class="list-decimal list-inside ml-4">') }} />
                                </>
                              )}
                            </div>
                          </div>
                          {isEditing && (
                            <button onClick={() => handleDeleteProject(index)} className="text-white hover:text-[#C69635] text-sm px-2 py-1 pb-0 transform sm:translate-x-8 translate-x-6" style={{ alignSelf: 'flex-end'}}>
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {isEditing && (
                        <div className="flex justify-end mt-4">
                          <button onClick={handleSave} className="text-white text-sm px-4 py-2 mt-4 border border-white hover:border-[#C69635] rounded">Save</button>
                        </div>
                      )}
                    </>
                  )}
                  {activeTab === 'settings' && (
                    <div className="flex flex-col mb-0">
                      <div className="text-[#C69635] text-xl font-bold mb-0">Name</div>
                      <p className="text-gray-400 text-xs mb-4">Update your first and last name below.</p>
                      <div>
                        <label className="text-white text-sm">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={handleFirstNameChange}
                          className="bg-[#231715] rounded text-left text-white w-full pl-1 mb-4 border-[#33211E] border-[2px] focus:border-[#C69635] focus:outline-none"
                          style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={handleLastNameChange}
                          className="bg-[#231715] rounded text-left text-white w-full pl-1 mb-4 border-[#33211E] border-[2px] focus:border-[#C69635] focus:outline-none"
                          style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                        />
                      </div>
                      <div className="flex justify-end mt-4">
                        <button onClick={handleSaveName} className="text-white text-sm px-4 py-2 border border-gray-400 hover:border-[#C69635] rounded">Save</button>
                      </div>
                      
                      <div className="text-[#C69635] text-xl font-bold mb-0 mt-8">Password Settings</div>
                      <div className="text-[#C99F4A] text-xs mb-2"> <a href="/ForgotPassword" className="text-[#C99F4A] hover:text-[#C69635]">Forgot password?</a> </div>
                      <p className="text-gray-400 text-xs mb-4">To change your password, you must enter your current password and a new password.
                        If you registered through Google, you must send your request to Google's password reset page.
                      </p>
                      <div>
                        <label className="text-white text-sm">Current Password</label>
                        <input
                          type="password"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="bg-[#231715] rounded text-left text-white w-full pl-1 mb-4 border-[#33211E] border-[2px] focus:border-[#C69635] focus:outline-none"
                          style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-[#231715] rounded text-left text-white w-full pl-1 mb-4 border-[#33211E] border-[2px] focus:border-[#C69635] focus:outline-none"
                          style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="bg-[#231715] rounded text-left text-white w-full pl-1 mb-4 border-[#33211E] border-[2px] focus:border-[#C69635] focus:outline-none"
                          style={{ boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.1)' }}
                        />
                      </div>
                     
                      <div className="flex justify-end mt-4">
                        <button onClick={handlePasswordChange} className="text-white text-sm px-4 py-2 border border-gray-400 hover:border-[#C69635] rounded">Change Password</button>
                      </div>

                    {/* Update Emailing preferences */}
                    <div className="text-[#C69635] text-xl font-bold mb-0 mt-8">Email Preferences</div>
                    <div className="text-[#C99F4A] text-xs mb-2">{user.email}.</div>
                    <p className="text-gray-400 text-xs mb-4">Update your email preferences below to receive updates and early access to our features from our newsletter.</p>
                    <div className="flex items-center">
                      <label className="text-white text-sm mr-2">Subscribe to Newsletter</label>
                      <input
                        type="checkbox"
                        checked={isSubscribed}
                        onChange={handleSubscriptionChange}
                        className="form-checkbox h-5 w-5 text-[#683F24] border-gray-300 rounded focus:ring-[#683F24] bg-[#724428]"
                        style={{ accentColor: '#C69635' }}
                      />
                    </div>
                    <div className="flex justify-end mt-4">
                      <button onClick={handleSaveSubscription} className="text-white text-sm px-4 py-2 border border-gray-400 hover:border-[#C69635] rounded">Save Changes</button>
                    </div>

                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>
          </div>
        </main>

      </div>
        

      {showProfileConfirmation && (
        <div className="fixed bottom-4 right-4 bg-[#C69635] text-[#1E1412] px-4 py-2 rounded-md shadow-md transition-opacity duration-300" style={{ opacity: showProfileConfirmation ? 1 : 0 }}>
          Profile updated successfully
        </div>
      )}
      {showNameConfirmation && (
        <div className="fixed bottom-4 right-4 bg-[#C69635] text-[#1E1412] font-bold px-4 py-2 rounded-md shadow-md transition-opacity duration-300" style={{ opacity: showNameConfirmation ? 1 : 0 }}>
          Name updated successfully
        </div>
      )}
      {showPasswordConfirmation && (
        <div className="fixed bottom-4 right-4 bg-[#C69635] text-[#1E1412] font-bold px-4 py-2 rounded-md shadow-md transition-opacity duration-300" style={{ opacity: showPasswordConfirmation ? 1 : 0 }}>
          Password updated successfully
        </div>
      )}
      {showError && isClient && (
        <div className="fixed bottom-4 right-4 bg-[#C69635] text-[#1E1412] font-bold px-4 py-2 rounded-md shadow-md transition-opacity duration-300" style={{ opacity: showError ? 1 : 0 }}>
          {errorMessage}
        </div>
      )}
      {showSuccess && isClient && (
        <div className="fixed bottom-4 right-4 bg-[#C69635] text-[#1E1412] font-bold p-4 rounded shadow-lg transition-opacity duration-300 ease-in-out">
          Email preferences updated successfully
        </div>
      )}
    </>
  )
}
