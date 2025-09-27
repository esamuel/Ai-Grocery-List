
import React, { useState } from 'react';
import { createNewList, doesListExist } from '../services/firebaseService';

interface ConnectionPageProps {
  onConnect: (listId: string) => void;
}

export const ConnectionPage: React.FC<ConnectionPageProps> = ({ onConnect }) => {
  const [listIdInput, setListIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newListId = await createNewList();
      onConnect(newListId);
    } catch (e) {
      setError("Could not create a new list. Please check your connection and try again.");
      console.error(e);
      setIsLoading(false);
    }
  };

  const handleJoinList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listIdInput.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const id = listIdInput.trim().toUpperCase();
      const exists = await doesListExist(id);
      if (exists) {
        onConnect(id);
      } else {
        setError("List ID not found. Please check the code and try again.");
        setIsLoading(false);
      }
    } catch (e) {
      setError("Could not connect to the list. Please check your connection.");
      console.error(e);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
        <span className="text-5xl">🛒</span>
        <h1 className="text-4xl font-bold text-gray-800 mt-4">Aii Grocery list</h1>
        <p className="text-gray-500 mt-2 mb-8">Collaborate with your family in real-time.</p>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-6" role="alert">{error}</div>}

        <div className="space-y-4">
          <button
            onClick={handleCreateList}
            disabled={isLoading}
            className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
          >
            {isLoading ? 'Creating...' : 'Create a New List'}
          </button>
          
          <div className="relative flex items-center" aria-hidden="true">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <form onSubmit={handleJoinList} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={listIdInput}
              onChange={(e) => setListIdInput(e.target.value)}
              placeholder="Enter Share Code"
              className="flex-grow bg-gray-100 border border-gray-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !listIdInput.trim()}
              className="bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
            >
              {isLoading ? 'Joining...' : 'Join a List'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
