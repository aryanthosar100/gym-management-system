import React, { useState } from "react";
import "./AddMember.css";
import logo from "../assets/logo.jpeg";


export default function AddMember() {
  const [form, setForm] = useState({ name: "", age: "", email: "", plan: "" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`New Member:\n${JSON.stringify(form, null, 2)}`);
  };

  return (
    <div className="addmember">
      <img src={logo} alt="Pulse Fitness" className="addmember__logo" />
      <div className="addmember__formBox">
        <h2>Add New Member</h2>
        <form onSubmit={handleSubmit}>
          <input name="name" placeholder="Full Name" onChange={handleChange} required />
          <input name="age" type="number" placeholder="Age" onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <select name="plan" onChange={handleChange} required>
            <option value="">Select Plan</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="pro">Pro</option>
          </select>
          <button type="submit">Add Member</button>
        </form>
      </div>
    </div>
  );
}
