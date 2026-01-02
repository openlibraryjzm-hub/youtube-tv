const PlaceholderPage = ({ title, description }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
      <div className="text-center">
        <div className="text-6xl font-black text-slate-300 mb-8">{title}</div>
        <p className="text-2xl text-slate-500">{description}</p>
      </div>
    </div>
  );
};

export default PlaceholderPage;


