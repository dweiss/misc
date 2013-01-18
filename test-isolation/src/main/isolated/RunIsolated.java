import java.io.File;
import java.net.URL;
import java.net.URLClassLoader;


public class RunIsolated
{
    public static void main(String [] args)
        throws Exception
    {
        ClassLoader cl1 = new URLClassLoader(new URL [] {
            new File("target/classes").toURI().toURL()
        });
        
        ClassLoader cl2 = new URLClassLoader(new URL [] {
            new File("target/guava-13.0.1.jar").toURI().toURL(),
            new File("target/test-classes").toURI().toURL()
        }, cl1);

        Runnable r = Runnable.class.cast(Class.forName("TestFoo", true, cl2).newInstance());
        r.run();
    }
}
