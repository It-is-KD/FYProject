import React from 'react';
import { Upload, Image, Camera } from "lucide-react"
import { NavLink } from 'react-router-dom';


const Button = ({ children,shadowcolor,className, ...props }) => (
    <button className={`px-4 py-2 rounded-md transition-all overflow-hidden duration-300 
    ${shadowcolor === 'white' ? 'shadow-[0_0_15px_5px_rgba(255,255,255,0.7)]' : ''}
    ${shadowcolor === 'black' ? 'shadow-[0_0_15px_5px_rgba(0,0,0,0.7)]' : ''}
    ${className}`} {...props}>
      {children}
    </button>
  )
  const FeatureCard = ({ icon: Icon, title, description }) => (
    <div className="bg-gray-800/50 p-6 rounded-xl hover:bg-gray-800/70 transition-all duration-300 border border-gray-700 hover:border-purple-500">
        <Icon className="w-8 h-8 text-purple-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
        <p className="text-gray-400">{description}</p>
    </div>
)

const Home = () => {
  return (
    <main className="flex-grow container mx-auto px-4 py-16 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-5xl font-bold mb-6 text-white">Albumify</h2>
          <p className="text-xl mb-8 text-white">Where AI Meets Memories - Transform set Photos into Smart, Organized Albums</p>
            <div className="flex justify-center gap-4 mb-16">
            <NavLink to="/signup">
            <Button shadowcolor="black" className="text-white font-semibold
        bg-gradient-to-r from-[#551f2b] via-[#3a1047] to-[#1e0144]
        hover:from-[#6a2735] hover:via-[#4d1459] hover:to-[#2a0161]
        transition-all duration-300 ease-in-out text-lg px-6 py-3">
              
              Upload Memories
              
            </Button>
            </NavLink>
            
            <Button shadowcolor="black" className="text-white font-semibold
        bg-gradient-to-r from-[#551f2b] via-[#3a1047] to-[#1e0144]
        hover:from-[#6a2735] hover:via-[#4d1459] hover:to-[#2a0161]
        transition-all duration-300 ease-in-out text-lg px-6 py-3">
              Learn More
            </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mt-12">
                <FeatureCard 
                    icon={Upload}
                    title="Easy Upload"
                    description="Drag and drop or click to upload your images instantly"
                />
                <FeatureCard 
                    icon={Image}
                    title="Smart Processing"
                    description="Advanced classifications to find your best photos"
                />
                <FeatureCard 
                    icon={Camera}
                    title="One Click Upload"
                    description="Upload the face you want to classify and that's it!"
                />
            </div>

          
        </div>
      </main>
  );
};

export default Home;