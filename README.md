import streamlit as st
import requests
import io

# Set up the page
st.set_page_config(page_title="AI Image Generator", page_icon="🎨")
st.title("🎨 AI Image Generator")
st.write("Describe the image you want to create!")

# User input
user_prompt = st.text_area("Image description:", placeholder="A red fox sitting in a forest...")

# Generate button
if st.button("Generate Image"):
    if user_prompt:
        with st.spinner("Generating your image..."):
            # TODO: Add your AI API calls here
            st.success("Image generated! (AI integration coming next)")
            
            # Placeholder - remove this later
            st.info(f"Prompt received: {user_prompt}")
    else:
        st.warning("Please enter a description first!")
      
