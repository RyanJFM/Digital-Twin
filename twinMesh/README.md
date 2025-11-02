## Unity Setup Guide

The Unity segment of this project handles the real-time 3D visualization of the Digital Twin.

### Steps to Recreate the Unity Environment
1. **Get a Humanoid Mesh**
   - Use any standard humanoid model with properly rigged joints (compatible with Unity’s Humanoid Rig).
   - Make sure the skeleton is correctly mapped in the *Rig* tab under *Avatar Configuration*.

2. **Set Up Kinect Integration**
   - Install the **Kinect Unity SDK wrapper** compatible with your Kinect version (v1, v2, or Azure).
   - Verify that body-tracking works in Unity before linking the model.

3. **Add the Control Scripts**
   - The required C# scripts are available in the `twinMesh/` folder.
   - Attach them to the humanoid model to map Kinect joint data to Unity transforms in real time.

4. **Network Setup**
   - The Unity scene listens for UDP packets from the Node.js server to update vital sign visuals and body movement.
   - Ensure Unity and the server are connected to the same local network (see Wi-Fi setup in the ESP32 README).

---

### File Size Notice

The Unity project files (models, assets, and libraries) exceed GitHub’s file size limits and are **not included** in this repository.

If you are interested in working further on this project, accessing the full Unity setup, or collaborating on extending the Digital Twin, please contact me via email to make arrangements.

**Thank you,**  
Ryan Fernando
